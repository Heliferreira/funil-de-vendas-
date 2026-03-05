import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Chart from 'chart.js/auto'
import Papa from 'papaparse'
import logo from './assets/LogoClickVerse.png'

// Importações para Segurança e Login
import { supabase } from './supabaseClient'
import Login from './login'

const API = 'https://funil-de-vendas-8cjn.onrender.com';

const STAGES = [
  { key: 'LEAD', label: 'Lead' },
  { key: 'QUALIFIED', label: 'Qualificado' },
  { key: 'PROPOSAL', label: 'Proposta' },
  { key: 'NEGOTIATION', label: 'Negociação' },
  { key: 'WON', label: 'Fechado' },
]

const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-700 border border-red-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  LOW: 'bg-green-100 text-green-700 border border-green-300',
}

function formatCurrency(n) {
  return n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function totalValue(list) {
  return list.reduce((acc, d) => acc + (d.value || 0), 0)
}

function DashboardPie({ data }) {
  const ref = React.useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const counts = STAGES.map(s => data.filter(d => d.stage === s.key).length)
    const chart = new Chart(ref.current, {
      type: 'pie',
      data: {
        labels: STAGES.map(s => s.label),
        datasets: [{ data: counts }]
      }
    })
    return () => chart.destroy()
  }, [data])

  return <canvas ref={ref} className="max-w-xs mx-auto" />
}

export default function App() {
  // --- ESTADO DE AUTENTICAÇÃO ---
  const [session, setSession] = useState(null)
  
  // --- ESTADOS DO FUNIL ---
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // Monitorar Sessão do Usuário
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchDeals() {
    if (!session) return;
    setLoading(true)
    try {
      const res = await axios.get(`${API}/deals`, {
        params: { q: query || undefined, priority: priority || undefined, _ts: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      })
      const data = Array.isArray(res.data) ? res.data : []
      setDeals(data)
    } catch (e) {
      console.error('Falha ao carregar deals:', e)
      setDeals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if(session) fetchDeals() }, [session])
  useEffect(() => { if(session) fetchDeals() }, [query, priority])

  // === FUNÇÃO DE IMPORTAÇÃO CSV ===
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importedDeals = results.data.map(row => ({
          title: row.Nome || 'Sem Nome',
          company: row.Empresa || 'N/A',
          email: row.Email || '', 
          phone: row.Celular || '',
          value: parseFloat(row.Valor) || 0,
          stage: 'LEAD',
          priority: 'MEDIUM',
          notes: `Cargo: ${row.Cargo || 'N/A'} | Gênero: ${row.Gênero || 'N/A'}`,
          dueDate: new Date().toISOString()
        }));

        try {
          await axios.post(`${API}/deals/bulk`, { deals: importedDeals });
          alert('Leads importados com sucesso!');
          fetchDeals();
        } catch (err) {
          console.error(err);
          alert('Erro ao importar leads.');
        }
      }
    });
  };

  const columns = useMemo(() => {
    const map = {}
    STAGES.forEach(s => { map[s.key] = [] })
    deals.forEach(d => { if (map[d.stage]) map[d.stage].push(d) })
    return map
  }, [deals])

  // Funções de CRUD e Drag&Drop (Mantidas do original)
  function openCreate() {
    setEditing({
      title: '', company: '', email: '', phone: '', value: 0,
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'MEDIUM', notes: '', stage: 'LEAD'
    })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing({ ...item, dueDate: item.dueDate?.slice(0, 10) })
    setModalOpen(true)
  }

  async function saveItem() {
    const payload = {
      ...editing,
      value: parseFloat(editing.value),
      dueDate: new Date(editing.dueDate)
    }
    if (editing.id) {
      await axios.put(`${API}/deals/${editing.id}`, payload)
    } else {
      await axios.post(`${API}/deals`, payload)
    }
    setModalOpen(false)
    setEditing(null)
    fetchDeals()
  }

  async function deleteItem(id) {
    if (!confirm('Excluir este negócio?')) return
    await axios.delete(`${API}/deals/${id}`)
    fetchDeals()
  }

  async function onDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    const sourceStage = source.droppableId
    const destStage = destination.droppableId
    if (sourceStage === destStage && destination.index === source.index) return

    const finalIds = Array.from(columns[destStage].map(d => d.id))
    if (sourceStage !== destStage) {
      const idxInDest = finalIds.indexOf(draggableId)
      if (idxInDest !== -1) finalIds.splice(idxInDest, 1)
    } else {
      finalIds.splice(source.index, 1)
    }
    finalIds.splice(destination.index, 0, draggableId)

    await axios.post(`${API}/deals/reorder`, {
      sourceStage,
      destinationStage: destStage,
      orderedIds: finalIds
    })
    fetchDeals()
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // --- LÓGICA DE PROTEÇÃO: SE NÃO HOUVER SESSÃO, MOSTRA LOGIN ---
  if (!session) {
    return <Login />
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <header className="mb-4 flex flex-col items-center text-center border-b pb-4 bg-white shadow-sm relative">
        <button 
          onClick={handleLogout}
          className="absolute right-4 top-4 text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
        >
          Sair
        </button>
        <img src={logo} alt="Click Verse" className="h-16 w-auto mb-3" />
        <h1 className="text-3xl font-bold text-black">Funil de Vendas</h1>
        <p className="text-sm text-gray-600">Control Metrics - Acesso Protegido</p>
      </header>

      {/* FILTROS E IMPORTAÇÃO */}
      <div className="grid md:grid-cols-3 gap-4 items-center mb-6">
        <div className="col-span-2 flex gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Buscar..."
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Prioridade (todas)</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>
        </div>
        
        <div className="text-right flex justify-end gap-2">
          <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded cursor-pointer transition-colors">
            <span>📥 Importar Leads</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button onClick={openCreate} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            + Novo negócio
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <section className="mb-8 rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold mb-2">Resumo Geral</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 border">
            <div className="text-sm text-gray-500">Negócios</div>
            <div className="text-2xl font-bold">{deals.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border">
            <div className="text-sm text-gray-500">Valor em aberto</div>
            <div className="text-2xl font-bold">{formatCurrency(totalValue(deals.filter(d => d.stage !== 'WON')))}</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border">
            <div className="text-sm text-gray-500">Valor fechado</div>
            <div className="text-2xl font-bold">{formatCurrency(totalValue(deals.filter(d => d.stage === 'WON')))}</div>
          </div>
        </div>
        <div className="mt-4">
          <DashboardPie data={deals} />
        </div>
      </section>

      {/* KANBAN BOARD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const list = columns[stage.key] || []
            return (
              <Droppable droppableId={stage.key} key={stage.key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                       className="bg-white rounded-xl p-3 shadow min-h-[400px] border-t-4 border-indigo-500">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{stage.label}</h3>
                      <div className="text-xs text-gray-500">
                        {list.length} • {formatCurrency(totalValue(list))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {list.map((item, index) => (
                        <Draggable draggableId={item.id} index={index} key={item.id}>
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                 className="rounded-lg border p-3 bg-gray-50 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-sm">{item.title}</div>
                                <span className={"text-[10px] px-2 py-0.5 rounded " + (PRIORITY_COLORS[item.priority] || '')}>
                                  {item.priority === 'HIGH' ? 'Alta' : item.priority === 'LOW' ? 'Baixa' : 'Média'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-800 font-bold mt-1">{item.company}</div>
                              <div className="text-[10px] text-blue-600 truncate">{item.email}</div>
                              <div className="text-[10px] text-gray-500">{item.phone}</div>
                              <div className="text-sm font-bold mt-1">{formatCurrency(item.value)}</div>
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => openEdit(item)} className="text-indigo-700 hover:underline text-[10px]">Editar</button>
                                <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:underline text-[10px]">Excluir</button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>

   {/* MODAL DE EDIÇÃO/CRIAÇÃO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl">
            <h3 className="text-lg font-bold mb-4">{editing?.id ? 'Editar Negócio' : 'Novo Negócio'}</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Título</label>
                <input className="border rounded px-3 py-2" value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Empresa</label>
                <input className="border rounded px-3 py-2" value={editing.company} onChange={e => setEditing({...editing, company: e.target.value})}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">E-mail</label>
                <input className="border rounded px-3 py-2" value={editing.email || ''} onChange={e => setEditing({...editing, email: e.target.value})}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Telefone</label>
                <input className="border rounded px-3 py-2" value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Valor</label>
                <input className="border rounded px-3 py-2" type="number" value={editing.value} onChange={e => setEditing({...editing, value: e.target.value})}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Previsão</label>
                <input className="border rounded px-3 py-2" type="date" value={editing.dueDate} onChange={e => setEditing({...editing, dueDate: e.target.value})}/>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs text-gray-500">Observações</label>
                <textarea 
                  className="border rounded px-3 py-2 w-full"
                  rows="3"
                  value={editing.notes || ''} 
                  onChange={e => setEditing({...editing, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setModalOpen(false); setEditing(null) }} className="px-6 py-2 rounded-lg border hover:bg-gray-50">Cancelar</button>
              <button onClick={saveItem} className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}