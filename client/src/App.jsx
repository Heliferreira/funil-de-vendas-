import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Chart from 'chart.js/auto'
import logo from './assets/LogoClickVerse.png';


const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

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
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // === FETCH reforçado (cache-buster + try/catch) ===
  async function fetchDeals() {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/deals`, {
        params: { q: query || undefined, priority: priority || undefined, _ts: Date.now() }, // cache-buster
        headers: { 'Cache-Control': 'no-cache' }
      })
      const data = Array.isArray(res.data) ? res.data : []
      setDeals(data)
    } catch (e) {
      console.error('Falha ao carregar deals:', e)
      setDeals([]) // evita crash/tela branca
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDeals() }, [])
  useEffect(() => { fetchDeals() }, [query, priority])

  const columns = useMemo(() => {
    const map = {}
    STAGES.forEach(s => { map[s.key] = [] })
    deals.forEach(d => { if (map[d.stage]) map[d.stage].push(d) })
    return map
  }, [deals])

  function openCreate() {
    setEditing({
      title: '',
      company: '',
      contact: '',
      value: 0,
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'MEDIUM',
      notes: '',
      stage: 'LEAD'
    })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing({
      ...item,
      dueDate: item.dueDate?.slice(0,10)
    })
    setModalOpen(true)
  }

  async function saveItem() {
    const payload = {
      ...editing,
      value: parseFloat(editing.value),
      dueDate: new Date(editing.dueDate)
    }
    if (editing.id) {
      await axios.put(`${API}/api/deals/${editing.id}`, payload)
    } else {
      await axios.post(`${API}/api/deals`, payload)
    }
    setModalOpen(false)
    setEditing(null)
    fetchDeals()
  }

  async function deleteItem(id) {
    if (!confirm('Excluir este negócio?')) return
    await axios.delete(`${API}/api/deals/${id}`)
    fetchDeals()
  }

  async function onDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    const sourceStage = source.droppableId
    const destStage = destination.droppableId
    if (sourceStage === destStage && destination.index === source.index) return

    // Recalcula a ordem na coluna de destino
    const finalIds = Array.from(columns[destStage].map(d => d.id))
    // Se o item veio de outra coluna, removemos ele da origem e inserimos no destino
    if (sourceStage !== destStage) {
      const idxInDest = finalIds.indexOf(draggableId)
      if (idxInDest !== -1) finalIds.splice(idxInDest, 1)
    } else {
      finalIds.splice(source.index, 1)
    }
    finalIds.splice(destination.index, 0, draggableId)

    await axios.post(`${API}/api/deals/reorder`, {
      sourceStage,
      destinationStage: destStage,
      orderedIds: finalIds
    })
    fetchDeals()
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
    <header className="mb-4 flex flex-col items-center text-center border-b pb-4 bg-white shadow-sm">
  <img src={logo} alt="Click Verse" className="h-30 w-auto mb-3" />
  <h1 className="text-3xl font-bold text-[#008080]">Funil de Vendas</h1>
  <p className="text-sm text-gray-600">Drag & Drop, filtros, CRUD, dashboard.</p>
</header>


    {/* avisos para evitar tela branca */}
      {loading && (
        <div className="mb-4 p-3 rounded bg-yellow-50 border text-sm">
          Carregando dados...
        </div>
      )}
      {!loading && deals.length === 0 && (
        <div className="mb-4 p-3 rounded bg-red-50 border text-sm">
          Nenhum dado carregado. Verifique se o seed foi executado e recarregue a página.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 items-center mb-6">
        <div className="col-span-2 flex gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Buscar por título, empresa, contato, observações..."
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
        <div className="text-right">
  <button
    onClick={openCreate}
    className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90"
  >
    + Novo negócio
  </button>
</div>

      </div>

      <section className="mb-8 rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold mb-2">Resumo</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 border">
            <div className="text-sm text-gray-500">Total de negócios</div>
            <div className="text-2xl font-bold">{deals.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border">
            <div className="text-sm text-gray-500">Valor em aberto</div>
            <div className="text-2xl font-bold">{formatCurrency(totalValue(deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST')))}</div>
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const list = columns[stage.key] || []
            return (
              <Droppable droppableId={stage.key} key={stage.key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                       className="bg-white rounded-xl p-3 shadow min-h-[200px]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{stage.label}</h3>
                      <div className="text-sm text-gray-500">
                        {list.length} • {formatCurrency(totalValue(list))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {list.map((item, index) => (
                        <Draggable draggableId={item.id} index={index} key={item.id}>
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                 className="rounded-lg border p-3 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold">{item.title}</div>
                                <span className={"text-xs px-2 py-0.5 rounded " + (PRIORITY_COLORS[item.priority] || '')}>
                                  {item.priority === 'HIGH' ? 'Alta' : item.priority === 'LOW' ? 'Baixa' : 'Média'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">{item.company} • {item.contact}</div>
                              <div className="text-sm">{formatCurrency(item.value)}</div>
                              <div className="text-xs text-gray-500">Previsto: {new Date(item.dueDate).toLocaleDateString('pt-BR')}</div>
                              {item.notes && <div className="text-xs text-gray-600 mt-1">{item.notes}</div>}
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => openEdit(item)} className="text-indigo-700 hover:underline text-sm">Editar</button>
                                <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:underline text-sm">Excluir</button>
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

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-xl">
            <h3 className="font-semibold mb-3">{editing?.id ? 'Editar negócio' : 'Novo negócio'}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Título"
                     value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})}/>
              <input className="border rounded px-3 py-2" placeholder="Empresa"
                     value={editing.company} onChange={e => setEditing({...editing, company: e.target.value})}/>
              <input className="border rounded px-3 py-2" placeholder="Contato"
                     value={editing.contact} onChange={e => setEditing({...editing, contact: e.target.value})}/>
              <input className="border rounded px-3 py-2" type="number" placeholder="Valor (R$)"
                     value={editing.value} onChange={e => setEditing({...editing, value: e.target.value})}/>
              <input className="border rounded px-3 py-2" type="date"
                     value={editing.dueDate} onChange={e => setEditing({...editing, dueDate: e.target.value})}/>
              <select className="border rounded px-3 py-2"
                      value={editing.priority} onChange={e => setEditing({...editing, priority: e.target.value})}>
                <option value="HIGH">Prioridade Alta</option>
                <option value="MEDIUM">Prioridade Média</option>
                <option value="LOW">Prioridade Baixa</option>
              </select>
              <select className="border rounded px-3 py-2"
                      value={editing.stage} onChange={e => setEditing({...editing, stage: e.target.value})}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                <option value="LOST">Perdido</option>
              </select>
              <textarea className="border rounded px-3 py-2 md:col-span-2" rows="3" placeholder="Observações"
                        value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})}/>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setModalOpen(false); setEditing(null) }}
                      className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button onClick={saveItem}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
