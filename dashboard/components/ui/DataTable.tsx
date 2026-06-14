'use client'
import { useState, useMemo } from 'react'
import { SkeletonBlock, SkeletonDataTableBody } from '@/components/ui/Skeleton'

// export interface Column<T> {
//   key: keyof T | string
//   label: string
//   sortable?: boolean
//   filterable?: boolean
//   filterPlaceholder?: string
//   render?: (value: unknown, row: T) => React.ReactNode
//   className?: string
// }

export interface Column<T> {
  id?: string               // ✅ AJOUT
  key: keyof T | string
  label: string
  sortable?: boolean
  filterable?: boolean
  filterPlaceholder?: string
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  pageSize?: number
  emptyMessage?: string
  actions?: (row: T) => React.ReactNode
  entityLabel?: string
  tableId?: string
  loading?: boolean
  onRowClick?: (row: T) => void
  selectedRowId?: string
  rowIdKey?: keyof T
}

const toolbarBtnClass =
  'py-2 px-3 inline-flex items-center gap-x-2 text-sm rounded-lg border border-slate-200/80 bg-surface-card text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:hover:bg-surface-card-dark'

const toolbarInputClass =
  'py-2 px-3 block w-full border border-slate-200/80 shadow-xs rounded-lg text-sm text-slate-800 focus:border-primary focus:ring-primary disabled:opacity-50 dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500'

const sortHeaderClass =
  'py-1 px-2.5 inline-flex items-center border border-transparent text-sm text-slate-500 rounded-md hover:border-slate-200 dark:text-slate-400 dark:hover:border-border-dark'

const pageBtnClass =
  'p-2.5 min-w-[40px] inline-flex justify-center items-center text-sm rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none dark:text-slate-200 dark:hover:bg-surface-elevated-dark'

const pageBtnActiveClass =
  'bg-primary/10 text-primary font-medium dark:bg-primary/15 dark:text-teal-300'

const SortSVG = () => (
  <svg className="size-3.5 ms-1 -me-0.5 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 15 5 5 5-5"/>
    <path d="m7 9 5-5 5 5"/>
  </svg>
)

const FilterSVG = () => (
  <svg className="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)

// Export CSV réel


export default function DataTable<T extends Record<string, unknown>>({
  data, columns, searchPlaceholder = 'Recherche...', pageSize: defaultPageSize = 50,
  emptyMessage = 'Aucune donnée disponible.', actions, entityLabel = 'entrées', tableId = 'table',
  loading = false, onRowClick, selectedRowId, rowIdKey = 'id' as keyof T,
}: DataTableProps<T>) {
  const safeData = data ?? []
  const [search, setSearch] = useState('')
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [showExport, setShowExport] = useState(false)

  const filtered = useMemo(() => {
    let rows = safeData
    if (search) { const q = search.toLowerCase(); rows = rows.filter(r => Object.values(r).some(v => String(v??''). toLowerCase().includes(q))) }
    Object.entries(colFilters).forEach(([k,v]) => { if(v) rows = rows.filter(r => String(r[k]??''). toLowerCase().includes(v.toLowerCase())) })
    return rows
  }, [safeData, search, colFilters])

  const sorted = useMemo(() => {
    if(!sortKey) return filtered
    return [...filtered].sort((a,b) => {
      const av=String(a[sortKey]??''). trim(), bv=String(b[sortKey]??''). trim()
      const an=parseFloat(av), bn=parseFloat(bv)
      if(!isNaN(an)&&!isNaN(bn)) return sortDir==='asc'?an-bn:bn-an
      return sortDir==='asc'?av.localeCompare(bv,'fr'):bv.localeCompare(av,'fr')
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length/pageSize))
  const paginated = sorted.slice((page-1)*pageSize, page*pageSize)
  const from = sorted.length===0?0:(page-1)*pageSize+1
  const to = Math.min(page*pageSize, sorted.length)

  const handleSort = (key:string) => { if(sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortKey(key);setSortDir('asc')} setPage(1) }

  // Page numbers to show
  const pageNums: number[] = []
  if(totalPages<=7) { for(let i=1;i<=totalPages;i++) pageNums.push(i) }
  else if(page<=4) { for(let i=1;i<=7;i++) pageNums.push(i) }
  else if(page>=totalPages-3) { for(let i=totalPages-6;i<=totalPages;i++) pageNums.push(i) }
  else { for(let i=page-3;i<=page+3;i++) pageNums.push(i) }


  const exportCSV = () => {
    const headers = columns.map(c => c.label).join(',')
    const rows = sorted.map(row => columns.map(c => String(row[c.key as keyof typeof row] ?? '')).join(',')).join('\n')
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'export.csv'; a.click()
  }
  return (
    <div className={`flex flex-col w-full mx-auto tg-card border-t-4 border-t-primary shadow-xs ${loading ? 'opacity-90' : ''}`} aria-busy={loading}>
      <div className="py-4 md:py-5 px-3 rounded-xl">

        {/* Toolbar */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="flex-0">
            <div className="relative max-w-xs">
              <label className="sr-only">Search</label>
              <input type="text" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
                className={`ps-9 ${toolbarInputClass}`}
                placeholder={searchPlaceholder} />
              <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-3">
                <svg className="size-4 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-end space-x-2">
            {/* Refresh */}
            <button type="button" onClick={()=>{setSearch('');setColFilters({});setPage(1)}}
              className={toolbarBtnClass}>
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
              </svg>
            </button>
            {/* Page size */}
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}
              className={`pe-8 ${toolbarInputClass}`}>
              {[10,15,20,25,50].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            {/* Export dropdown */}
            <div className="relative">
              <button type="button" onClick={()=>setShowExport(o=>!o)}
                className={toolbarBtnClass}>
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                <svg className="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-40" onClick={()=>setShowExport(false)}/>
                  <div className="absolute right-0 top-full mt-2 z-50 w-32 tg-card shadow-lg">
                    <div className="p-1 space-y-0.5">
                      {[{label:'Copier',icon:'📋'},{label:'Imprimer',icon:'🖨️'}].map(i=>(
                        <button key={i.label} onClick={()=>setShowExport(false)} className="flex w-full items-center gap-x-2 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 dark:text-slate-300 dark:hover:bg-primary/15">{i.icon} {i.label}</button>
                      ))}
                    </div>
                    <div className="p-1 space-y-0.5 border-t border-slate-200/80 dark:border-border-dark">
                      {[{label:'Excel',icon:'📗'},{label:'CSV',icon:'📄'},{label:'PDF',icon:'📕'}].map(i=>(
                        <button key={i.label} onClick={() => {
                          exportCSV()
                          setShowExport(false)
                        }} className="flex w-full items-center gap-x-2 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 dark:text-slate-300 dark:hover:bg-primary/15">{i.icon} {i.label}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[480px]">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden min-h-[480px]">
              <table className="min-w-full">
                <thead className="border-b border-slate-200/80 dark:border-border-dark bg-slate-50/80 dark:bg-surface-elevated-dark/50">
                  <tr>
                    {columns.map((col, colIndex) => (
                      <th key={`${col.id ?? String(col.key)}-${colIndex}`} scope="col" className="py-1 group text-start font-normal focus:outline-none">
                        {col.filterable ? (
                          <div className="flex items-center">
                            <span className="py-1 px-2.5 text-sm text-slate-500 rounded-md dark:text-slate-400">{col.label}</span>
                            <div className="relative ms-2">
                              <button type="button" onClick={()=>setOpenFilter(openFilter===String(col.key)?null:String(col.key))}
                                className="size-[30px] inline-flex justify-center items-center gap-2 rounded-lg text-slate-500 border border-transparent hover:border-slate-200 focus:outline-none dark:text-slate-400 dark:hover:border-border-dark">
                                <FilterSVG/>
                              </button>
                              {openFilter===String(col.key) && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={()=>setOpenFilter(null)}/>
                                  <div className="absolute z-20 tg-card shadow-md p-2 mt-2" style={{minWidth:160}}>
                                    <div className="max-w-sm flex gap-x-2">
                                      <input type="text" autoFocus value={colFilters[String(col.key)]??''} onChange={e=>{setColFilters(f=>({...f,[String(col.key)]:e.target.value}));setPage(1)}}
                                        className="py-1 px-2.5 block w-full border border-slate-200/80 rounded-md text-[13px] focus:border-primary focus:ring-primary dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500"
                                        placeholder={col.filterPlaceholder??col.label.toLowerCase()}/>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className={`${sortHeaderClass} ${col.sortable ? 'cursor-pointer select-none' : ''}`}
                            onClick={()=>col.sortable&&handleSort(String(col.key))}>
                            {col.label}
                            {col.sortable && <SortSVG/>}
                          </div>
                        )}
                      </th>
                    ))}
                    {actions && <th scope="col" className="py-2 px-3 text-end font-normal text-sm text-slate-500 dark:text-slate-400">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-border-dark">
                  {loading ? (
                    <SkeletonDataTableBody
                      columns={columns.length}
                      hasActions={!!actions}
                    />
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={columns.length+(actions?1:0)} className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</td></tr>
                  ) : paginated.map((row,i) => {
                    const rowId = String(row[rowIdKey] ?? '')
                    const isSelected = !!onRowClick && !!selectedRowId && rowId === selectedRowId
                    return (
                    <tr
                      key={i}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={[
                        onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-elevated-dark/50' : '',
                        isSelected ? 'bg-primary/5 dark:bg-primary/10' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {columns.map((col, colIndex) => (
                        <td key={`${col.id ?? String(col.key)}-${i}-${colIndex}`} className={`p-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 ${col.className??''}`}>
                          {col.render?col.render(row[col.key as keyof T],row):String(row[col.key as keyof T]??'—')}
                        </td>
                      ))}
                      {actions && <td className="p-3 whitespace-nowrap text-end text-sm font-medium"><div className="inline-flex gap-x-2">{actions(row)}</div></td>}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center mt-4">
          <div className="flex items-center space-x-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className={pageBtnClass}>
              <span>«</span>
            </button>
            {pageNums.map(pg=>(
              <button key={pg} onClick={()=>setPage(pg)}
                className={`${pageBtnClass} ${pg===page ? pageBtnActiveClass : ''}`}>
                {pg}
              </button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              className={pageBtnClass}>
              <span>»</span>
            </button>
          </div>
          <div className="text-xs text-slate-500 ms-auto dark:text-slate-400">
            {loading ? (
              <SkeletonBlock className="inline-block h-3 w-48 rounded-full align-middle" />
            ) : (
              <>
                Affichage <span className="font-semibold">{from}</span> sur{' '}
                <span className="font-semibold">{to}</span> des{' '}
                <span className="font-semibold">{sorted.length}</span> {entityLabel}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
