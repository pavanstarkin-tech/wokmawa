import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMenu } from '@/lib/paakashala-store'

export const Route = createFileRoute('/image-picker')({
  component: ImagePicker,
})

function ImagePicker() {
  const fullMenu = useMenu()
  const [data, setData] = useState<Record<string, string[]>>({})
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/scraped-images.json')
      .then(res => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load images", err)
        setLoading(false)
      })
  }, [])

  const handleSelect = (productId: string, imageUrl: string) => {
    setSelections(prev => ({ ...prev, [productId]: imageUrl }))
  }

  const handleCopy = () => {
    const output = fullMenu.map(item => {
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        selectedImage: selections[item.id] || null
      }
    })

    navigator.clipboard.writeText(JSON.stringify(output, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopySimple = () => {
    // Just array of selected image URLs directly applied to MENU if needed
    // or just { name, image }
    const output = fullMenu.map(item => ({
      name: item.name,
      image: selections[item.id] || null
    }))
    navigator.clipboard.writeText(JSON.stringify(output, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="p-8 text-center text-primary">Loading images from scraped-images.json... (Make sure the scraping script has run)</div>
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-50 bg-card border-b border-border shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brown-deep">Image Selector</h1>
          <p className="text-xs text-muted-foreground">{Object.keys(selections).length} / {fullMenu.length} selected</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCopySimple}
            className="px-4 py-2 bg-gold-gradient text-brown-deep font-bold rounded-lg shadow-luxe active:scale-95 transition-transform"
          >
            {copied ? "Copied!" : "Copy JSON"}
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {fullMenu.map(item => {
          const itemSearchTerm = item.name.toLowerCase()
          
          // Match logic
          const hasImageFiles = data[item.name] && data[item.name].length > 0
          // If term matches exactly, always show.
          // Otherwise try to find related images.
          const images = data[item.id] || []
          const selected = selections[item.id]
          
          return (
            <div key={item.id} className="space-y-3">
              <div>
                <h3 className="font-bold text-lg text-primary">{item.name}</h3>
                <p className="text-xs text-muted-foreground">Category: {item.category}</p>
              </div>
              
              {images.length === 0 ? (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">No images found for this item yet.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(item.id, img)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-4 transition-all duration-200 ${selected === img ? "border-gold shadow-[0_0_15px_rgba(184,134,42,0.5)] scale-105 z-10" : "border-transparent hover:border-gold/50"}`}
                    >
                      <img src={img} alt={`${item.name} ${i}`} className="w-full h-full object-cover" loading="lazy" />
                      {selected === img && (
                        <div className="absolute inset-0 bg-gold/20 flex items-center justify-center">
                          <div className="bg-gold text-brown-deep rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-md">✓</div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
