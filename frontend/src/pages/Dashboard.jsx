import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Search, Copy, X, CheckSquare, Clock } from 'lucide-react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [data, setData] = useState([])
  const [selectedUre, setSelectedUre] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Search and filter states
  const [ureSearch, setUreSearch] = useState('')
  const [servidorSearch, setServidorSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Selection state
  const [selectedCpfs, setSelectedCpfs] = useState([])
  const [copiedFeedback, setCopiedFeedback] = useState(false)

  // Tracking state (LocalStorage + Supabase)
  const [resolvidos, setResolvidos] = useState([])

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

  // Listen to storage changes (e.g. from the Form tab)
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

  // Save resolvidos to localStorage whenever it changes inside this tab
  useEffect(() => {
    if (!loading && resolvidos.length > 0) {
      localStorage.setItem('resolvidos_cpfs', JSON.stringify(resolvidos))
    }
  }, [resolvidos, loading])

  // Reset selection and filters when changing URE
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

  // Apply Status Filter
  if (statusFilter === 'concluido') {
    filteredServidores = filteredServidores.filter(s => resolvidos.includes(s.cpf))
  } else if (statusFilter === 'faltando') {
    filteredServidores = filteredServidores.filter(s => !resolvidos.includes(s.cpf))
  }

  const totalServidores = selectedUre?.servidores.length || 0
  
  // Calculate stats for current URE
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
                            <Link 
                              to={`/form?ure=${encodeURIComponent(selectedUre.name)}&cpf=${servidor.cpf}&nome=${encodeURIComponent(servidor.nome)}`} 
                              target="_blank"
                              className="btn btn-outline"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                              title="Visualizar Formulário"
                            >
                              <ExternalLink size={14} />
                              Link
                            </Link>
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
    </div>
  )
}
