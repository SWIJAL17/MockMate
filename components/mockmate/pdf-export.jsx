'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ExportPdfButton({ targetId = 'report-root', filename = 'MockMate-Report.pdf', variant = 'outline' }) {
  const [busy, setBusy] = useState(false)

  const exportPdf = async () => {
    setBusy(true)
    try {
      const el = document.getElementById(targetId)
      if (!el) throw new Error('Report not found')
      // Expand any collapsed <details> before capture
      const detailsEls = el.querySelectorAll('details')
      const priorOpen = []
      detailsEls.forEach(d => { priorOpen.push(d.open); d.open = true })

      const [{ default: html2canvas }, jsPDFMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const jsPDF = jsPDFMod.default || jsPDFMod.jsPDF

      const canvas = await html2canvas(el, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth,
      })

      // Restore details states
      detailsEls.forEach((d, i) => { d.open = priorOpen[i] })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW
      const imgH = (canvas.height * imgW) / canvas.width

      let heightLeft = imgH
      let position = 0
      pdf.setFillColor(0, 0, 0)
      pdf.rect(0, 0, pageW, pageH, 'F')
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH, undefined, 'FAST')
      heightLeft -= pageH
      while (heightLeft > 0) {
        position = heightLeft - imgH
        pdf.addPage()
        pdf.setFillColor(0, 0, 0)
        pdf.rect(0, 0, pageW, pageH, 'F')
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH, undefined, 'FAST')
        heightLeft -= pageH
      }
      pdf.save(filename)
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Export failed')
    } finally { setBusy(false) }
  }

  return (
    <Button onClick={exportPdf} disabled={busy} variant={variant} size="lg"
      className={variant === 'outline' ? 'h-12 px-6 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]' : ''}>
      {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Exporting…</> : <><Download className="h-4 w-4 mr-1" /> Export PDF</>}
    </Button>
  )
}
