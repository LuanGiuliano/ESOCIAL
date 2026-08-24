import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabase'

export default function FormPage() {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    ure: '',
    dependentes: '',
    observacoes: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFormData(prev => ({
      ...prev,
      ure: params.get('ure') || '',
      cpf: params.get('cpf') || '',
      nome: params.get('nome') || ''
    }))
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('servidores_atualizacao')
        .insert([
          { 
            nome: formData.nome, 
            cpf: formData.cpf, 
            ure: formData.ure,
            dependentes: formData.dependentes,
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Nome do Servidor</label>
              <input className="form-input" type="text" value={formData.nome} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">CPF</label>
              <input className="form-input" type="text" value={formData.cpf} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Lotação (URE/DRE)</label>
              <input className="form-input" type="text" value={formData.ure} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0' }}></div>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="dependentes" className="form-label" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
              SOLICITAÇÃO DE DADOS DOS DEPENDENTES: (NOME COMPLETO, CPF e DATA DE NASCIMENTO)
            </label>
            <textarea 
              className="form-input"
              id="dependentes" 
              name="dependentes"
              rows="4" 
              placeholder="Ex: João da Silva - CPF: 123.456.789-00 - Nasc: 10/05/2010"
              value={formData.dependentes}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="observacoes" className="form-label">Observações Adicionais (Opcional)</label>
            <textarea 
              className="form-input"
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
