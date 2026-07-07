"use client"

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, X } from 'lucide-react'

interface QRCodeDisplayProps {
    qrCode: string
    batchId: string
    grainType: string
    isOpen: boolean
    onClose: () => void
}

export default function QRCodeDisplay({ qrCode, batchId, grainType, isOpen, onClose }: QRCodeDisplayProps) {
    const [qrImage, setQrImage] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const generateQRCode = useCallback(async () => {
        setLoading(true)
        try {
            // Create QR code data URL with batch information
            const qrData = JSON.stringify({
                type: 'grain_batch',
                batch_id: batchId,
                qr_code: qrCode,
                grain_type: grainType,
                timestamp: new Date().toISOString(),
                url: `${window.location.origin}/batch/${qrCode}`
            })

            const qrImageUrl = await QRCode.toDataURL(qrData, {
                width: 250,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            })
            setQrImage(qrImageUrl)
        } catch (error) {
            console.error('Error generating QR code:', error)
        }
        setLoading(false)
    }, [qrCode, batchId, grainType])

    useEffect(() => {
        if (qrCode && isOpen) {
            generateQRCode()
        }
    }, [qrCode, isOpen, generateQRCode])

    const downloadQRCode = () => {
        if (qrImage) {
            const link = document.createElement('a')
            link.download = `grain-batch-${batchId}-qr.png`
            link.href = qrImage
            link.click()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        QR Code - Batch {batchId}
                    </DialogTitle>
                    <DialogDescription>
                        Scan this QR code to view batch details on mobile devices
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* QR Code Display */}
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-sm text-muted-foreground">
                                {grainType} - Batch {batchId}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            {loading ? (
                                <div className="w-[250px] h-[250px] flex items-center justify-center bg-gray-100 rounded-lg">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                                        <p className="text-sm text-gray-600">Generating QR Code...</p>
                                    </div>
                                </div>
                            ) : qrImage ? (
                                <div className="text-center">
                                    <Image
                                        src={qrImage}
                                        alt={`QR Code for batch ${batchId}`}
                                        width={250}
                                        height={250}
                                        className="border rounded-lg shadow-sm mx-auto"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        QR Code: {qrCode}
                                    </p>
                                </div>
                            ) : (
                                <div className="w-[250px] h-[250px] flex items-center justify-center bg-gray-100 rounded-lg">
                                    <p className="text-gray-600">No QR code available</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Scan with any mobile QR code scanner</li>
                            <li>• View batch details instantly</li>
                            <li>• Access real-time information</li>
                            <li>• Share with team members</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            onClick={downloadQRCode}
                            disabled={!qrImage}
                            className="flex-1"
                            variant="outline"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download QR
                        </Button>
                        <Button onClick={onClose} className="flex-1">
                            <X className="h-4 w-4 mr-2" />
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
