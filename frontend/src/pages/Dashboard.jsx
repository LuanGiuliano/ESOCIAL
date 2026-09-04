import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Search, Copy, X, Clock, FileSpreadsheet, Eye, ChevronDown, ClipboardCheck } from 'lucide-react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [data, setData] = useState([])
  const [selectedUre, setSelectedUre] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Search and filter states
  const [ureSearch, setUreSearch] = useState('')
  const [servidorSearch, setServidorSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dreFilter, setDreFilter] = useState('all')
  
  // Selection state for copying links
  const [selectedCpfs, setSelectedCpfs] = useState([])
  const [copiedFeedback, setCopiedFeedback] = useState(false)

  // Tracking state (LocalStorage + Supabase)
  const [resolvidos, setResolvidos] = useState([])
  const [analisados, setAnalisados] = useState([])

  // Modal states
  const [viewModal, setViewModal] = useState({ open: false, data: null, loading: false, error: false })

  // Load initial data
  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(jsonData => {
        if (jsonData.length > 0) {
          const geral = {
            name: 'GERAL (Todas as Unidades)',
            isGeral: true,
            servidores: jsonData.flatMap(u => u.servidores)
          };
          setData([geral, ...jsonData])
          setSelectedUre(geral)
        } else {
          setData([])
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
          // Aumentar o limite para 10000, pois o padrao e 1000
          const { data } = await supabase.from('servidores_atualizacao').select('cpf').limit(10000)
          if (data) cpfsSupabase = data.map(d => String(d.cpf).replace('.0', '').replace(/\D/g, ''))
        } catch (error) {
          console.error("Erro ao puxar dados do supabase", error)
        }
      }

      cpfsLocal = cpfsLocal.map(c => String(c).replace('.0', '').replace(/\D/g, ''))
      const merged = Array.from(new Set([...cpfsLocal, ...cpfsSupabase]))
      setResolvidos(merged)
      localStorage.setItem('resolvidos_cpfs', JSON.stringify(merged))

      let analisadosLocal = []
      const savedAnalisados = localStorage.getItem('analisados_cpfs')
      if (savedAnalisados) {
        try { analisadosLocal = JSON.parse(savedAnalisados) } catch(e) {}
      }

      let analisadosBase = []
      try {
        const res = await fetch('/analisados.json')
        if (res.ok) {
          analisadosBase = await res.json()
        }
      } catch(e) {
        console.error("Erro ao puxar analisados.json", e)
      }

      const mergedAnalisados = Array.from(new Set([...analisadosLocal, ...analisadosBase].map(c => String(c).replace('.0', '').replace(/\D/g, ''))))
      setAnalisados(mergedAnalisados)
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
      if (e.key === 'analisados_cpfs' && e.newValue) {
        try {
          setAnalisados(JSON.parse(e.newValue))
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
    if (!loading && analisados.length > 0) {
      localStorage.setItem('analisados_cpfs', JSON.stringify(analisados))
    }
  }, [analisados, loading])

  useEffect(() => {
    setSelectedCpfs([])
    setServidorSearch('')
    setStatusFilter('all')
    setDreFilter('all')
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

  const normalizeCpf = (cpf) => String(cpf).replace('.0', '').replace(/\D/g, '');

  if (statusFilter === 'concluido') {
    filteredServidores = filteredServidores.filter(s => resolvidos.includes(normalizeCpf(s.cpf)) && !analisados.includes(normalizeCpf(s.cpf)))
  } else if (statusFilter === 'faltando') {
    filteredServidores = filteredServidores.filter(s => !resolvidos.includes(normalizeCpf(s.cpf)) && !analisados.includes(normalizeCpf(s.cpf)))
  } else if (statusFilter === 'analisado') {
    filteredServidores = filteredServidores.filter(s => analisados.includes(normalizeCpf(s.cpf)))
  }

  if (dreFilter !== 'all') {
    filteredServidores = filteredServidores.filter(s => 
      s.cidade && ['BELEM', 'ANANINDEUA'].includes(s.cidade.trim().toUpperCase()) && s.numero_dre === dreFilter
    )
  }

  const uniqueDres = selectedUre ? Array.from(new Set(
    selectedUre.servidores
      .filter(s => s.cidade && ['BELEM', 'ANANINDEUA'].includes(s.cidade.trim().toUpperCase()))
      .map(s => s.numero_dre)
  )).sort() : []

  const totalServidores = selectedUre?.servidores.length || 0
  const currentUreCpfs = selectedUre?.servidores.map(s => normalizeCpf(s.cpf)) || []
  const analisadosNestaUre = currentUreCpfs.filter(cpf => analisados.includes(cpf)).length
  const apenasConcluidosNestaUre = currentUreCpfs.filter(cpf => resolvidos.includes(cpf) && !analisados.includes(cpf)).length
  const faltamNestaUre = currentUreCpfs.filter(cpf => !resolvidos.includes(cpf) && !analisados.includes(cpf)).length

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCpfs(filteredServidores.map(s => s.cpf))
    } else {
      setSelectedCpfs([])
    }
  }

  const handleSelectOne = (rawCpf) => {
    const cpf = normalizeCpf(rawCpf);
    if (selectedCpfs.includes(cpf)) {
      setSelectedCpfs(selectedCpfs.filter(c => c !== cpf))
    } else {
      setSelectedCpfs([...selectedCpfs, cpf])
    }
  }

  const toggleResolvido = (rawCpf) => {
    const cpf = normalizeCpf(rawCpf);
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
    const selectedData = filteredServidores.filter(s => selectedCpfs.includes(normalizeCpf(s.cpf)));
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
      
      const newResolvidos = resolvidos.filter(c => c !== normalizeCpf(viewModal.data.cpf));
      setResolvidos(newResolvidos);
      localStorage.setItem('resolvidos_cpfs', JSON.stringify(newResolvidos));
      
      const newAnalisados = analisados.filter(c => c !== normalizeCpf(viewModal.data.cpf));
      setAnalisados(newAnalisados);
      localStorage.setItem('analisados_cpfs', JSON.stringify(newAnalisados));
      
      setViewModal({ open: false, data: null });
    } catch(err) {
      console.error(err);
      alert("Erro ao excluir resposta. Verifique se o banco de dados permite a exclusão.");
    }
  }

  const handleConcluirAnalise = () => {
    if (viewModal.data) {
      const cpfNorm = normalizeCpf(viewModal.data.cpf);
      if (!analisados.includes(cpfNorm)) {
        const novosAnalisados = [...analisados, cpfNorm];
        setAnalisados(novosAnalisados);
        localStorage.setItem('analisados_cpfs', JSON.stringify(novosAnalisados));
      }
    }
    setViewModal({ open: false, data: null });
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
                style={ure.isGeral ? { fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' } : {}}
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
                <span className="stat-value" style={{ color: '#15803d' }}>{apenasConcluidosNestaUre}</span>
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

              <div 
                className="glass-panel stat-card" 
                style={{ 
                  backgroundColor: '#f3e8ff', 
                  borderColor: '#e9d5ff',
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'analisado' ? '0 0 0 3px rgba(147, 51, 234, 0.3)' : 'none',
                  transform: statusFilter === 'analisado' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setStatusFilter('analisado')}
                title="Filtrar apenas os que já tiveram a análise concluída"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9333ea' }}>
                  <ClipboardCheck size={20} />
                  <span className="stat-label" style={{ color: '#7e22ce', fontSize: '0.9rem' }}>Análise Concluída</span>
                </div>
                <span className="stat-value" style={{ color: '#6b21a8' }}>{analisadosNestaUre}</span>
              </div>
            </div>

            {/* Table Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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

                {uniqueDres.length > 0 && (
                  <div style={{ position: 'relative', width: '200px' }}>
                    <select
                      className="search-input"
                      style={{ paddingRight: '2rem', marginBottom: 0, appearance: 'none', cursor: 'pointer', backgroundColor: 'var(--bg-color)' }}
                      value={dreFilter}
                      onChange={(e) => setDreFilter(e.target.value)}
                    >
                      <option value="all">Todas as DREs</option>
                      {uniqueDres.map((dre, idx) => (
                        <option key={idx} value={dre}>
                          DRE: {dre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '10px', top: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                  </div>
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
                    <th>Matrícula</th>
                    <th>Vínculo</th>
                    <th>DRE</th>
                    <th>Nome do Servidor</th>
                    <th>Escola</th>
                    <th>CPF</th>
                    <th>Cargo / Função</th>
                    <th>Status Local</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServidores.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Nenhum servidor encontrado na busca ou no filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredServidores.map((servidor, index) => {
                      const isResolvido = resolvidos.includes(normalizeCpf(servidor.cpf));
                      const isAnalisado = analisados.includes(normalizeCpf(servidor.cpf));
                      
                      return (
                        <tr key={index} style={{ opacity: isResolvido ? 0.7 : 1 }}>
                          <td>
                            <input 
                              type="checkbox" 
                              className="checkbox-custom"
                              checked={selectedCpfs.includes(normalizeCpf(servidor.cpf))}
                              onChange={() => handleSelectOne(servidor.cpf)}
                            />
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{servidor.matricula || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{servidor.vinculo || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {servidor.cidade && ['BELEM', 'ANANINDEUA'].includes(servidor.cidade.trim().toUpperCase()) 
                              ? (servidor.numero_dre || 'Não encontrado') 
                              : '-'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{servidor.nome}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} title={servidor.dependente}>
                              Pendência: {servidor.dependente.length > 30 ? servidor.dependente.substring(0, 30) + '...' : servidor.dependente}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{servidor.escola || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatCPF(servidor.cpf)}</td>
                          <td style={{ fontSize: '0.875rem' }}>{servidor.cargo}</td>
                          <td>
                            {isAnalisado ? (
                              <span className="status-badge" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', cursor: 'pointer' }} onClick={() => toggleResolvido(servidor.cpf)}>
                                ✓ Análise Concluída
                              </span>
                            ) : isResolvido ? (
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
                  {(() => {
                    try {
                      const parsed = JSON.parse(viewModal.data.dependentes);
                      if (Array.isArray(parsed)) {
                        return parsed.map((d, i) => (
                          <div key={i} style={{ marginBottom: i < parsed.length - 1 ? '1rem' : 0, paddingBottom: i < parsed.length - 1 ? '1rem' : 0, borderBottom: i < parsed.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                            <p style={{ fontSize: '0.875rem' }}><strong>Nome:</strong> {d.nome}</p>
                            <p style={{ fontSize: '0.875rem' }}><strong>CPF:</strong> {d.cpf}</p>
                            <p style={{ fontSize: '0.875rem' }}><strong>Nascimento:</strong> {d.data_nascimento}</p>
                            <p style={{ fontSize: '0.875rem' }}><strong>Parentesco:</strong> {d.parentesco}</p>
                          </div>
                        ))
                      }
                      return <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{viewModal.data.dependentes}</p>
                    } catch(e) {
                      return <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{viewModal.data.dependentes}</p>
                    }
                  })()}
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
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeleteResponse}>Excluir Resposta</button>
                  <button className="btn btn-primary" style={{ backgroundColor: '#9333ea', borderColor: '#9333ea' }} onClick={handleConcluirAnalise}>Concluir Análise</button>
                </div>
              ) : (
                <div />
              )}
              <button className="btn btn-outline" onClick={() => setViewModal({ open: false, data: null })}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
