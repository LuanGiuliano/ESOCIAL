import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Search, Copy, X, Clock, FileSpreadsheet, Eye, ChevronDown } from 'lucide-react'
import { supabase } from '../supabase'
import * as XLSX from 'xlsx'

export default function Dashboard() {
  const [data, setData] = useState([])
  const [selectedUre, setSelectedUre] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Search and filter states
  const [ureSearch, setUreSearch] = useState('')
  const [servidorSearch, setServidorSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Selection state for copying links
  const [selectedCpfs, setSelectedCpfs] = useState([])
  const [copiedFeedback, setCopiedFeedback] = useState(false)

  // Tracking state (LocalStorage + Supabase)
  const [resolvidos, setResolvidos] = useState([])

  // Modal states
  const [viewModal, setViewModal] = useState({ open: false, data: null, loading: false, error: false })
  const [exportModalOpen, setExportModalOpen] = useState(false)
  
  // Export selections
  const [exportUres, setExportUres] = useState([])
  const [exportCpfs, setExportCpfs] = useState([])
  const [expandedExportUres, setExpandedExportUres] = useState([])

  // Load initial data
  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(jsonData => {
        setData(jsonData)
        if (jsonData.length > 0) {
          setSelectedUre(jsonData[0])
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Error loading data:", err)
        setLoading(false)
      })

    const loadData = async () => {
      let cpfsLocal = []
      const saved = localStorage.getItem('resolvidos_cpfs')
      if (saved) {
        try { cpfsLocal = JSON.parse(saved) } catch(e) {}
      }

      let cpfsSupabase = []
      if (supabase) {
        try {
          const { data } = await supabase.from('servidores_atualizacao').select('cpf')
          if (data) cpfsSupabase = data.map(d => d.cpf)
        } catch (error) {
          console.error("Erro ao puxar dados do supabase", error)
        }
      }

      const merged = Array.from(new Set([...cpfsLocal, ...cpfsSupabase]))
      setResolvidos(merged)
      localStorage.setItem('resolvidos_cpfs', JSON.stringify(merged))
    }

    loadData()
  }, [])

  // Listen to storage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'resolvidos_cpfs' && e.newValue) {
        try {
          setResolvidos(JSON.parse(e.newValue))
        } catch(err) {}
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (!loading && resolvidos.length > 0) {
      localStorage.setItem('resolvidos_cpfs', JSON.stringify(resolvidos))
    }
  }, [resolvidos, loading])

  useEffect(() => {
    setSelectedCpfs([])
    setServidorSearch('')
    setStatusFilter('all')
  }, [selectedUre])

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>Carregando dados...</div>
      </div>
    )
  }

  const filteredUres = data.filter(ure => 
    ure.name.toLowerCase().includes(ureSearch.toLowerCase())
  )

  let filteredServidores = selectedUre ? selectedUre.servidores.filter(s => 
    s.nome.toLowerCase().includes(servidorSearch.toLowerCase()) ||
    s.cpf.includes(servidorSearch) ||
    s.cargo.toLowerCase().includes(servidorSearch.toLowerCase())
  ) : []

  if (statusFilter === 'concluido') {
    filteredServidores = filteredServidores.filter(s => resolvidos.includes(s.cpf))
  } else if (statusFilter === 'faltando') {
    filteredServidores = filteredServidores.filter(s => !resolvidos.includes(s.cpf))
  }

  const totalServidores = selectedUre?.servidores.length || 0
  const currentUreCpfs = selectedUre?.servidores.map(s => s.cpf) || []
  const resolvidosNestaUre = currentUreCpfs.filter(cpf => resolvidos.includes(cpf)).length
  const faltamNestaUre = totalServidores - resolvidosNestaUre

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCpfs(filteredServidores.map(s => s.cpf))
    } else {
      setSelectedCpfs([])
    }
  }

  const handleSelectOne = (cpf) => {
    if (selectedCpfs.includes(cpf)) {
      setSelectedCpfs(selectedCpfs.filter(c => c !== cpf))
    } else {
      setSelectedCpfs([...selectedCpfs, cpf])
    }
  }

  const toggleResolvido = (cpf) => {
    if (resolvidos.includes(cpf)) {
      setResolvidos(resolvidos.filter(c => c !== cpf))
    } else {
      setResolvidos([...resolvidos, cpf])
    }
  }

  const generateLink = (servidor) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/form?ure=${encodeURIComponent(selectedUre.name)}&cpf=${servidor.cpf}&nome=${encodeURIComponent(servidor.nome)}`;
  }

  const handleCopySelectedLinks = () => {
    if (selectedCpfs.length === 0) return;
    const selectedData = filteredServidores.filter(s => selectedCpfs.includes(s.cpf));
    let textToCopy = `Links de Atualização Cadastral - ${selectedUre.name}\n\n`;
    selectedData.forEach(s => {
      textToCopy += `Servidor(a): ${s.nome}\n`;
      textToCopy += `Link: ${generateLink(s)}\n\n`;
    });

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedFeedback(true);
      const novosResolvidos = new Set([...resolvidos, ...selectedCpfs]);
      setResolvidos(Array.from(novosResolvidos));
      setTimeout(() => {
        setCopiedFeedback(false);
        setSelectedCpfs([]); 
      }, 3000);
    });
  }

  const formatCPF = (cpf) => {
    const cleanCPF = String(cpf).replace(/\D/g, '').padStart(11, '0');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  // View Modal Logic
  const openViewModal = async (servidor) => {
    setViewModal({ open: true, data: null, loading: true, error: false });
    try {
      if (supabase) {
        const { data: resp, error } = await supabase
          .from('servidores_atualizacao')
          .select('*')
          .eq('cpf', servidor.cpf)
          .order('atualizado_em', { ascending: false })
          .limit(1)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
          throw error;
        }
        
        setViewModal({ 
          open: true, 
          loading: false, 
          error: false, 
          data: resp || null, // null if no rows found
          servidorBase: servidor 
        });
      } else {
        setViewModal({ open: true, loading: false, error: false, data: null, servidorBase: servidor });
      }
    } catch (error) {
      console.error(error);
      setViewModal({ open: true, loading: false, error: true, data: null, servidorBase: servidor });
    }
  }

  const handleDeleteResponse = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir a resposta de ${viewModal.data.nome}? Essa ação não pode ser desfeita e ele voltará a ficar como pendente.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('servidores_atualizacao')
        .delete()
        .eq('id', viewModal.data.id);
        
      if (error) throw error;
      
      const newResolvidos = resolvidos.filter(c => c !== viewModal.data.cpf);
      setResolvidos(newResolvidos);
      localStorage.setItem('resolvidos_cpfs', JSON.stringify(newResolvidos));
      
      setViewModal({ open: false, data: null });
    } catch(err) {
      console.error(err);
      alert("Erro ao excluir resposta. Verifique se o banco de dados permite a exclusão.");
    }
  }

  // Export Logic
  const toggleExportUre = (ureName) => {
    const ure = data.find(u => u.name === ureName);
    if (exportUres.includes(ureName)) {
      setExportUres(exportUres.filter(u => u !== ureName));
      const cpfsToRemove = ure.servidores.map(s => s.cpf);
      setExportCpfs(exportCpfs.filter(cpf => !cpfsToRemove.includes(cpf)));
    } else {
      setExportUres([...exportUres, ureName]);
      const cpfsToAdd = ure.servidores.map(s => s.cpf);
      setExportCpfs(Array.from(new Set([...exportCpfs, ...cpfsToAdd])));
    }
  }

  const toggleExportCpf = (cpf) => {
    if (exportCpfs.includes(cpf)) {
      setExportCpfs(exportCpfs.filter(c => c !== cpf));
    } else {
      setExportCpfs([...exportCpfs, cpf]);
    }
  }

  const toggleExpandedExportUre = (ureName) => {
    if (expandedExportUres.includes(ureName)) {
      setExpandedExportUres(expandedExportUres.filter(u => u !== ureName));
    } else {
      setExpandedExportUres([...expandedExportUres, ureName]);
    }
  }

  const selectAllForExport = () => {
    const allUres = data.map(u => u.name);
    let allCpfs = [];
    data.forEach(u => u.servidores.forEach(s => allCpfs.push(s.cpf)));
    setExportUres(allUres);
    setExportCpfs(allCpfs);
  }

  const clearExportSelection = () => {
    setExportUres([]);
    setExportCpfs([]);
  }

  const handleGenerateSpreadsheet = async () => {
    if (exportCpfs.length === 0) {
      alert("Nenhum servidor selecionado para exportação.");
      return;
    }

    const rows = [];
    
    // We will fetch from supabase to get their responses if they answered
    let supabaseData = [];
    if (supabase) {
      try {
        const { data: sData } = await supabase.from('servidores_atualizacao').select('*').in('cpf', exportCpfs);
        if (sData) supabaseData = sData;
      } catch(e) {
        console.error("Erro ao buscar dados do supabase para exportação", e);
      }
    }

    data.forEach(ure => {
      ure.servidores.forEach(s => {
        if (exportCpfs.includes(s.cpf)) {
          const resp = supabaseData.find(d => d.cpf === s.cpf);
          rows.push({
            "URE / DRE": ure.name,
            "Nome do Servidor": s.nome,
            "CPF": formatCPF(s.cpf),
            "Cargo": s.cargo,
            "Status": resolvidos.includes(s.cpf) ? "Concluído" : "Pendente",
            "Pendência Original": s.dependente,
            "Resposta - Dependentes": resp ? resp.dependentes : "",
            "Resposta - Observações": resp ? resp.observacoes : "",
            "Data da Resposta": resp ? new Date(resp.atualizado_em).toLocaleString('pt-BR') : ""
          });
        }
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servidores");
    XLSX.writeFile(workbook, "Relatorio_Atualizacao_Cadastral.xlsx");
    setExportModalOpen(false);
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <img src="/logo-esocial.png" alt="eSocial" style={{ maxWidth: '140px', height: 'auto', marginBottom: '0.5rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
            Controle de Servidores
          </p>
        </div>
        <div className="sidebar-content">
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '1.5rem', backgroundColor: '#10b981' }}
            onClick={() => setExportModalOpen(true)}
          >
            <FileSpreadsheet size={16} /> Gerar Planilha
          </button>

          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar DRE/URE..." 
              style={{ paddingLeft: '2rem', paddingRight: '2rem', marginBottom: 0 }}
              value={ureSearch}
              onChange={(e) => setUreSearch(e.target.value)}
            />
            {ureSearch && (
              <button 
                onClick={() => setUreSearch('')}
                style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {ureSearch && (
            <button 
              onClick={() => setUreSearch('')}
              style={{ width: '100%', marginBottom: '1rem', fontSize: '0.75rem', padding: '0.25rem' }} 
              className="btn btn-outline"
            >
              Mostrar todas as DREs
            </button>
          )}

          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', color: 'var(--text-secondary)', marginTop: !ureSearch ? '1rem' : 0 }}>
            Unidades ({filteredUres.length})
          </h3>
          
          {filteredUres.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nenhuma unidade encontrada.</p>
          ) : (
            filteredUres.map(ure => (
              <div 
                key={ure.name} 
                className={`ure-item ${selectedUre?.name === ure.name ? 'active' : ''}`}
                onClick={() => setSelectedUre(ure)}
              >
                <span>{ure.name}</span>
                <ChevronRight size={16} />
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {selectedUre ? (
          <>
            <div className="topbar">
              <div>
                <h1>{selectedUre.name}</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Acompanhamento de Atualizações Cadastrais
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div 
                className="glass-panel stat-card" 
                style={{ 
                  backgroundColor: 'var(--accent-color)', 
                  color: 'white', 
                  borderColor: 'var(--accent-color)',
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'all' ? '0 0 0 3px rgba(59, 130, 246, 0.4)' : 'none',
                  transform: statusFilter === 'all' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setStatusFilter('all')}
                title="Mostrar todos os servidores com pendência"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.9)' }}>
                  <Users size={20} />
                  <span className="stat-label" style={{ color: 'white', fontSize: '0.9rem' }}>Total com Pendência</span>
                </div>
                <span className="stat-value" style={{ color: 'white' }}>{totalServidores}</span>
              </div>
              
              <div 
                className="glass-panel stat-card" 
                style={{ 
                  backgroundColor: '#f0fdf4', 
                  borderColor: '#bbf7d0',
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'concluido' ? '0 0 0 3px rgba(22, 101, 52, 0.3)' : 'none',
                  transform: statusFilter === 'concluido' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setStatusFilter('concluido')}
                title="Filtrar apenas os concluídos/enviados"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                  <CheckCircle2 size={20} />
                  <span className="stat-label" style={{ color: '#166534', fontSize: '0.9rem' }}>Concluídos / Enviados</span>
                </div>
                <span className="stat-value" style={{ color: '#15803d' }}>{resolvidosNestaUre}</span>
              </div>

              <div 
                className="glass-panel stat-card" 
                style={{ 
                  backgroundColor: '#fff7ed', 
                  borderColor: '#fed7aa',
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'faltando' ? '0 0 0 3px rgba(234, 88, 12, 0.3)' : 'none',
                  transform: statusFilter === 'faltando' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setStatusFilter('faltando')}
                title="Filtrar apenas os que faltam enviar"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ea580c' }}>
                  <Clock size={20} />
                  <span className="stat-label" style={{ color: '#9a3412', fontSize: '0.9rem' }}>Faltam Enviar</span>
                </div>
                <span className="stat-value" style={{ color: '#c2410c' }}>{faltamNestaUre}</span>
              </div>
            </div>

            {/* Table Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar Servidor por nome ou CPF..." 
                  style={{ paddingLeft: '2.2rem', paddingRight: '2rem', marginBottom: 0 }}
                  value={servidorSearch}
                  onChange={(e) => setServidorSearch(e.target.value)}
                />
                {servidorSearch && (
                  <button 
                    onClick={() => setServidorSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    title="Limpar busca"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {selectedCpfs.length > 0 && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleCopySelectedLinks}
                  style={{ backgroundColor: copiedFeedback ? 'var(--success)' : 'var(--accent-color)' }}
                >
                  {copiedFeedback ? (
                    <><CheckCircle2 size={18} /> Copiado e Marcado como Enviado!</>
                  ) : (
                    <><Copy size={18} /> Copiar {selectedCpfs.length} Links Selecionados</>
                  )}
                </button>
              )}
            </div>

            {/* Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                        <input 
                          type="checkbox" 
                          className="checkbox-custom"
                          checked={filteredServidores.length > 0 && selectedCpfs.length === filteredServidores.length}
                          onChange={handleSelectAll}
                        />
                        <span>Selecionar todos</span>
                      </label>
                    </th>
                    <th>Nome do Servidor</th>
                    <th>CPF</th>
                    <th>Cargo / Função</th>
                    <th>Status Local</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServidores.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Nenhum servidor encontrado na busca ou no filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredServidores.map((servidor, index) => {
                      const isResolvido = resolvidos.includes(servidor.cpf);
                      
                      return (
                        <tr key={index} style={{ opacity: isResolvido ? 0.7 : 1 }}>
                          <td>
                            <input 
                              type="checkbox" 
                              className="checkbox-custom"
                              checked={selectedCpfs.includes(servidor.cpf)}
                              onChange={() => handleSelectOne(servidor.cpf)}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{servidor.nome}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} title={servidor.dependente}>
                              Pendência: {servidor.dependente.length > 30 ? servidor.dependente.substring(0, 30) + '...' : servidor.dependente}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatCPF(servidor.cpf)}</td>
                          <td style={{ fontSize: '0.875rem' }}>{servidor.cargo}</td>
                          <td>
                            {isResolvido ? (
                              <span className="status-badge status-ok" style={{ cursor: 'pointer' }} onClick={() => toggleResolvido(servidor.cpf)}>
                                ✓ Concluído/Enviado
                              </span>
                            ) : (
                              <span className="status-badge status-pending" style={{ cursor: 'pointer' }} onClick={() => toggleResolvido(servidor.cpf)}>
                                Faltando
                              </span>
                            )}
                          </td>
                          <td style={{ display: 'flex', gap: '0.5rem' }}>
                            {isResolvido ? (
                              <button 
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#10b981' }}
                                onClick={() => openViewModal(servidor)}
                                title="Ver resposta preenchida no sistema"
                              >
                                <Eye size={14} /> Visualizar
                              </button>
                            ) : (
                              <Link 
                                to={`/form?ure=${encodeURIComponent(selectedUre.name)}&cpf=${servidor.cpf}&nome=${encodeURIComponent(servidor.nome)}`} 
                                target="_blank"
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                title="Visualizar Formulário em branco"
                              >
                                <ExternalLink size={14} />
                                Link
                              </Link>
                            )}
                            <button 
                              className="btn btn-outline"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderColor: isResolvido ? 'var(--border-color)' : 'var(--success)', color: isResolvido ? 'var(--text-secondary)' : 'var(--success)' }}
                              onClick={() => toggleResolvido(servidor.cpf)}
                              title="Marcar como Enviado/Pendente"
                            >
                              {isResolvido ? 'Desmarcar' : 'Marcar Enviado'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="glass-panel empty-state">
            <Users size={48} style={{ opacity: 0.5 }} />
            <h3>Nenhuma URE Selecionada</h3>
            <p>Selecione uma Unidade Regional de Ensino na barra lateral para visualizar os dados.</p>
          </div>
        )}
      </main>

      {/* View Data Modal */}
      {viewModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '90%', padding: '2rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Dados do Servidor</h2>
              <button onClick={() => setViewModal({ open: false, data: null })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            {viewModal.loading ? (
              <p>Buscando informações no banco de dados...</p>
            ) : viewModal.error ? (
              <p style={{ color: 'var(--danger)' }}>Erro ao buscar dados.</p>
            ) : viewModal.data ? (
              <div>
                <p><strong>Nome:</strong> {viewModal.data.nome}</p>
                <p><strong>CPF:</strong> {formatCPF(viewModal.data.cpf)}</p>
                <p><strong>DRE/URE:</strong> {viewModal.data.ure}</p>
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Dependentes Informados:</p>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{viewModal.data.dependentes}</p>
                </div>
                {viewModal.data.observacoes && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Observações:</p>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{viewModal.data.observacoes}</p>
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                  Preenchido em: {new Date(viewModal.data.atualizado_em).toLocaleString('pt-BR')}
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--warning)', marginBottom: '1rem' }}>O servidor ainda não preencheu o formulário no sistema, mas foi marcado manualmente como enviado.</p>
                <p><strong>Nome:</strong> {viewModal.servidorBase?.nome}</p>
                <p><strong>Pendência Original:</strong> {viewModal.servidorBase?.dependente}</p>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              {viewModal.data ? (
                <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeleteResponse}>Excluir Resposta</button>
              ) : (
                <div />
              )}
              <button className="btn btn-outline" onClick={() => setViewModal({ open: false, data: null })}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '600px', maxWidth: '100%', height: '80vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={20} /> Exportar para Planilha
              </h2>
              <button onClick={() => setExportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-color)', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: 'white' }} onClick={selectAllForExport}>Selecionar Tudo</button>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: 'white' }} onClick={clearExportSelection}>Limpar Seleção</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {data.map(ure => {
                const selectedCount = ure.servidores.filter(s => exportCpfs.includes(s.cpf)).length;
                const isExpanded = expandedExportUres.includes(ure.name);
                
                return (
                  <div key={ure.name} style={{ marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-color)' }}>
                      <button 
                        onClick={() => toggleExpandedExportUre(ure.name)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.5rem', display: 'flex' }}
                      >
                        <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(270deg)', transition: 'transform 0.2s' }} />
                      </button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0 }}>
                        <input 
                          type="checkbox" 
                          className="checkbox-custom"
                          checked={exportUres.includes(ure.name) || selectedCount === ure.servidores.length}
                          onChange={() => toggleExportUre(ure.name)}
                        />
                        <span style={{ fontWeight: 600 }}>{ure.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                          ({selectedCount} / {ure.servidores.length} selecionados)
                        </span>
                      </label>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '0.5rem 1rem 0.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {ure.servidores.map(s => (
                          <label key={s.cpf} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontSize: '0.875rem' }}>
                            <input 
                              type="checkbox" 
                              className="checkbox-custom"
                              checked={exportCpfs.includes(s.cpf)}
                              onChange={() => toggleExportCpf(s.cpf)}
                            />
                            <span>{s.nome}</span>
                            {resolvidos.includes(s.cpf) && <span style={{ color: 'var(--success)', fontSize: '0.7rem', fontWeight: 600 }}>[Concluído]</span>}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {exportCpfs.length} servidores selecionados
              </span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setExportModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleGenerateSpreadsheet} disabled={exportCpfs.length === 0}>
                  <FileSpreadsheet size={16} /> Gerar Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
