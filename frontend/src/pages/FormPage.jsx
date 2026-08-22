import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabase' // Supabase import for future use

export default function FormPage() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const initialData = {
    nome: searchParams.get('nome') || '',
    cpf: searchParams.get('cpf') || '',
    ure: searchParams.get('ure') || '',
    dependentes: '',
    observacoes: ''
  }

  const [formData, setFormData] = useState(initialData)

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
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel empty-state" style={{ maxWidth: '400px' }}>
          <CheckCircle2 size={48} color="var(--success)" />
          <h2>Dados Enviados!</h2>
          <p>Suas informações foram atualizadas com sucesso. Você pode fechar esta aba.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ overflowY: 'auto' }}>
      <div className="glass-panel form-container">
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h2>Atualização Cadastral</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Por favor, verifique seus dados e preencha as informações pendentes.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input 
              type="text" 
              name="nome"
              className="form-input" 
              value={formData.nome}
              onChange={handleChange}
              readOnly 
              style={{ opacity: 0.7 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">CPF</label>
            <input 
              type="text" 
              name="cpf"
              className="form-input" 
              value={formData.cpf}
              onChange={handleChange}
              readOnly
              style={{ opacity: 0.7 }}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Lotação (URE/DRE)</label>
            <input 
              type="text" 
              name="ure"
              className="form-input" 
              value={formData.ure}
              onChange={handleChange}
              readOnly
              style={{ opacity: 0.7 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dependentes (Nome Completo, Data de Nascimento)</label>
            <textarea 
              name="dependentes"
              className="form-input" 
              rows="4" 
              placeholder="Ex: João Silva (Filho) - 10/05/2010"
              value={formData.dependentes}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">Observações Adicionais (Opcional)</label>
            <textarea 
              name="observacoes"
              className="form-input" 
              rows="2" 
              value={formData.observacoes}
              onChange={handleChange}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Confirmar Atualização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
