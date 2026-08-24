import { useState, useEffect } from 'react'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'

export default function FormPage() {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    ure: '',
    observacoes: ''
  })
  
  const [dependentes, setDependentes] = useState([
    { nome: '', cpf: '', data_nascimento: '', parentesco: '' }
  ])

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFormData({
      ...formData,
      ure: params.get('ure') || '',
      cpf: params.get('cpf') || '',
      nome: params.get('nome') || ''
    })
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleDependenteChange = (index, field, value) => {
    const novosDependentes = [...dependentes]
    novosDependentes[index][field] = value
    setDependentes(novosDependentes)
  }

  const addDependente = () => {
    setDependentes([...dependentes, { nome: '', cpf: '', data_nascimento: '', parentesco: '' }])
  }

  const removeDependente = (index) => {
    const novos = dependentes.filter((_, i) => i !== index)
    setDependentes(novos)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const dependentesStr = JSON.stringify(dependentes)
      
      const { data, error } = await supabase
        .from('servidores_atualizacao')
        .insert([
          { 
            nome: formData.nome, 
            cpf: formData.cpf, 
            ure: formData.ure,
            dependentes: dependentesStr,
            observacoes: formData.observacoes,
            atualizado_em: new Date()
          }
        ])
        
      if (error) throw error
      
      // Update local storage so the Dashboard tab updates immediately
      const saved = localStorage.getItem('resolvidos_cpfs');
      let cpfsLocal = saved ? JSON.parse(saved) : [];
      if (!cpfsLocal.includes(formData.cpf)) {
        cpfsLocal.push(formData.cpf);
        localStorage.setItem('resolvidos_cpfs', JSON.stringify(cpfsLocal));
      }

      setLoading(false)
      setSubmitted(true)
    } catch (error) {
      console.error("Erro ao salvar:", error.message)
      alert("Houve um erro ao salvar os dados.")
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="form-container">
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--success)', margin: '0 auto 1.5rem auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Atualização Recebida!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Obrigado, {formData.nome}. Seus dados de dependentes foram enviados com sucesso e o setor responsável já foi notificado.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.875rem' }}>
            Você já pode fechar esta página.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="form-container">
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center', color: 'var(--accent-color)' }}>
          Atualização Cadastral e-social
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Formulário para regularização de dependentes
        </p>

        <form onSubmit={handleSubmit} className="form-content">
          
          {/* Readonly info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Nome do Servidor</label>
              <input type="text" value={formData.nome} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
            </div>
            <div className="form-group">
              <label>CPF</label>
              <input type="text" value={formData.cpf} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Unidade Regional</label>
              <input type="text" value={formData.ure} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0' }}></div>
          
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Dados dos Dependentes</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Preencha os dados de todos os seus dependentes que possuem pendência.
          </p>

          {dependentes.map((dep, index) => (
            <div key={index} style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', position: 'relative', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--accent-color)' }}>Dependente {index + 1}</span>
                {dependentes.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeDependente(index)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nome Completo do Dependente</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João da Silva"
                    value={dep.nome}
                    onChange={(e) => handleDependenteChange(index, 'nome', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>CPF do Dependente</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 123.456.789-00"
                    value={dep.cpf}
                    onChange={(e) => handleDependenteChange(index, 'cpf', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={dep.data_nascimento}
                    onChange={(e) => handleDependenteChange(index, 'data_nascimento', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Grau de Parentesco</label>
                  <select 
                    value={dep.parentesco}
                    onChange={(e) => handleDependenteChange(index, 'parentesco', e.target.value)}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="" disabled>Selecione...</option>
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="Enteado(a)">Enteado(a)</option>
                    <option value="Pai/Mãe">Pai/Mãe</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={addDependente}
            className="btn btn-outline" 
            style={{ width: '100%', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Adicionar outro dependente
          </button>

          <div className="form-group">
            <label htmlFor="observacoes">Observações (Opcional)</label>
            <textarea 
              id="observacoes" 
              name="observacoes"
              rows="3" 
              placeholder="Alguma informação adicional importante..."
              value={formData.observacoes}
              onChange={handleChange}
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Confirmar Atualização'}
          </button>
        </form>
      </div>
    </div>
  )
}
