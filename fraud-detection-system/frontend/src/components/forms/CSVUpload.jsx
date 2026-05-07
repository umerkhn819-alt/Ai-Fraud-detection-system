import { useCallback, useState } from 'react'

export default function CSVUpload({ onFile, disabled }) {
  const [drag, setDrag] = useState(false)
  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDrag(false)
      const f = e.dataTransfer.files?.[0]
      if (f) onFile(f)
    },
    [onFile]
  )
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        drag ? 'border-brand-500 bg-blue-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-sm text-slate-600">Drop creditcard-style CSV here, or choose a file.</p>
      <input
        type="file"
        accept=".csv"
        disabled={disabled}
        className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-600"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}
