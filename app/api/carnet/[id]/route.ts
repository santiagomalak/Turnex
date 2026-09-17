import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: persona, error } = await supabase
      .from('persona')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !persona) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 })
    }

    // Generar QR con el DNI
    const qrData = persona.dni || `TURNE-${persona.id.slice(0, 8).toUpperCase()}`
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M',
    })

    // Convertir base64 a buffer
    const qrBase64 = qrCodeDataUrl.split(',')[1]
    const qrBuffer = Buffer.from(qrBase64, 'base64')

    // Crear PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([250, 160]) // Tamaño tarjeta: ~8.5 x 5.4 cm en points (1pt = 1/72 inch)
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const qrImage = await pdfDoc.embedPng(qrBuffer)

    // Colores
    const primaryColor = rgb(0.1, 0.1, 0.15) // dark slate
    const accentColor = rgb(0.05, 0.45, 0.85) // blue
    const white = rgb(1, 1, 1)

    // Fondo
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: white,
    })

    // Header bar
    page.drawRectangle({
      x: 0,
      y: height - 35,
      width,
      height: 35,
      color: primaryColor,
    })

    // Logo / Título
    page.drawText('TUR NEX', {
      x: 15,
      y: height - 27,
      size: 14,
      font: fontBold,
      color: white,
    })

    page.drawText('COMPLEJO DEPORTIVO', {
      x: 15,
      y: height - 42,
      size: 7,
      font: font,
      color: rgb(0.7, 0.8, 0.9),
    })

    // QR Code (lado derecho)
    const qrSize = 90
    const qrX = width - qrSize - 15
    const qrY = height - qrSize - 50
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    })

    // Datos del socio (lado izquierdo)
    let yPos = height - 55
    const leftMargin = 15
    const lineHeight = 16

    // Nombre completo
    page.drawText(`${persona.nombre} ${persona.apellido}`, {
      x: leftMargin,
      y: yPos,
      size: 14,
      font: fontBold,
      color: primaryColor,
    })
    yPos -= lineHeight + 4

    // DNI
    page.drawText(`DNI: ${persona.dni || '—'}`, {
      x: leftMargin,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.4),
    })
    yPos -= lineHeight

    // Rol / Plan
    const planNombre = persona.plan_membresia_id ? 'Con plan' : 'Sin plan'
    page.drawText(`${persona.rol?.charAt(0).toUpperCase() + persona.rol?.slice(1) || 'Socio'} • ${planNombre}`, {
      x: leftMargin,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.4),
    })
    yPos -= lineHeight

    // Estado
    const estadoColor = persona.estado === 'activo' ? rgb(0.1, 0.6, 0.2) : 
                        persona.estado === 'moroso' ? rgb(0.8, 0.2, 0.2) : rgb(0.5, 0.5, 0.5)
    page.drawText(`Estado: ${persona.estado}`, {
      x: leftMargin,
      y: yPos,
      size: 10,
      font: fontBold,
      color: estadoColor,
    })
    yPos -= lineHeight + 4

    // Email / Teléfono
    if (persona.email) {
      page.drawText(`📧 ${persona.email}`, {
        x: leftMargin,
        y: yPos,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.5),
      })
      yPos -= lineHeight - 2
    }
    if (persona.telefono) {
      page.drawText(`📞 ${persona.telefono}`, {
        x: leftMargin,
        y: yPos,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.5),
      })
      yPos -= lineHeight - 2
    }

    // Línea separadora
    page.drawLine({
      start: { x: leftMargin, y: yPos - 4 },
      end: { x: width - 15, y: yPos - 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.9),
    })
    yPos -= 14

    // Footer con instrucciones
    page.drawText('ESCANEAR EN KIOSCO PARA ENTRADA/SALIDA', {
      x: leftMargin,
      y: yPos,
      size: 7,
      font: fontBold,
      color: accentColor,
    })
    yPos -= 12

    page.drawText('Vigencia según plan activo', {
      x: leftMargin,
      y: yPos,
      size: 7,
      font: font,
      color: rgb(0.5, 0.5, 0.6),
    })
    yPos -= 10

    page.drawText(`Generado: ${new Date().toLocaleDateString('es-AR')}`, {
      x: leftMargin,
      y: yPos,
      size: 6,
      font: font,
      color: rgb(0.6, 0.6, 0.7),
    })

    // Borde decorativo
    page.drawRectangle({
      x: 5,
      y: 5,
      width: width - 10,
      height: height - 10,
      borderColor: rgb(0.85, 0.85, 0.9),
      borderWidth: 1,
      opacity: 0,
    })

    // Esquinas decorativas
    const cornerSize = 8
    const cornerOffset = 8
    // Top-left
    page.drawLine({ start: { x: 5 + cornerOffset, y: height - 5 }, end: { x: 5 + cornerOffset + cornerSize, y: height - 5 }, thickness: 2, color: accentColor })
    page.drawLine({ start: { x: 5 + cornerOffset, y: height - 5 }, end: { x: 5 + cornerOffset, y: height - 5 - cornerSize }, thickness: 2, color: accentColor })
    // Top-right
    page.drawLine({ start: { x: width - 5 - cornerOffset, y: height - 5 }, end: { x: width - 5 - cornerOffset - cornerSize, y: height - 5 }, thickness: 2, color: accentColor })
    page.drawLine({ start: { x: width - 5 - cornerOffset, y: height - 5 }, end: { x: width - 5 - cornerOffset, y: height - 5 - cornerSize }, thickness: 2, color: accentColor })
    // Bottom-left
    page.drawLine({ start: { x: 5 + cornerOffset, y: 5 }, end: { x: 5 + cornerOffset + cornerSize, y: 5 }, thickness: 2, color: accentColor })
    page.drawLine({ start: { x: 5 + cornerOffset, y: 5 }, end: { x: 5 + cornerOffset, y: 5 + cornerSize }, thickness: 2, color: accentColor })
    // Bottom-right
    page.drawLine({ start: { x: width - 5 - cornerOffset, y: 5 }, end: { x: width - 5 - cornerOffset - cornerSize, y: 5 }, thickness: 2, color: accentColor })
    page.drawLine({ start: { x: width - 5 - cornerOffset, y: 5 }, end: { x: width - 5 - cornerOffset, y: 5 + cornerSize }, thickness: 2, color: accentColor })

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carnet-${persona.dni || persona.id.slice(0,8)}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error generando carnet PDF:', error)
    return NextResponse.json({ error: 'Error generando carnet' }, { status: 500 })
  }
}