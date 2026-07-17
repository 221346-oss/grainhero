const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * PDF Generation Service
 * Generates batch reports and buyer invoices
 */
class PDFService {

    /**
     * Generate a comprehensive batch traceability report PDF
     * Returns a Buffer
     */
    static async generateBatchReport(batch, activityLogs = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const buffers = [];

                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // ====== HEADER ======
                doc.rect(0, 0, 595, 100).fill('#1a7a3a');
                doc.fontSize(24).fillColor('#ffffff').text('🌾 GrainHero', 50, 25);
                doc.fontSize(12).fillColor('#d4edda').text('Batch Traceability Report', 50, 55);
                doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 75);

                doc.fillColor('#333333');
                doc.moveDown(3);

                // ====== BATCH DETAILS ======
                this._sectionHeader(doc, 'Batch Information');
                this._row(doc, 'Batch ID', batch.batch_id);
                this._row(doc, 'Grain Type', batch.grain_type);
                this._row(doc, 'Variety', batch.variety || 'N/A');
                this._row(doc, 'Grade', batch.grade || 'Standard');
                this._row(doc, 'Quantity', `${batch.quantity_kg} kg`);
                this._row(doc, 'Status', batch.status);
                this._row(doc, 'Moisture Content', batch.moisture_content ? `${batch.moisture_content}%` : 'N/A');
                this._row(doc, 'Protein Content', batch.protein_content ? `${batch.protein_content}%` : 'N/A');

                // ====== SOURCE ======
                this._sectionHeader(doc, 'Source Information');
                this._row(doc, 'Farmer', batch.farmer_name || 'N/A');
                this._row(doc, 'Contact', batch.farmer_contact || 'N/A');
                this._row(doc, 'Source Location', batch.source_location || 'N/A');
                this._row(doc, 'Harvest Date', batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : 'N/A');
                this._row(doc, 'Intake Date', batch.intake_date ? new Date(batch.intake_date).toLocaleDateString() : 'N/A');

                // ====== SENSOR SUMMARY ======
                if (batch.sensor_summary) {
                    this._sectionHeader(doc, 'Sensor Data Summary');
                    this._row(doc, 'Avg Temperature', batch.sensor_summary.avg_temperature ? `${batch.sensor_summary.avg_temperature}°C` : 'N/A');
                    this._row(doc, 'Avg Humidity', batch.sensor_summary.avg_humidity ? `${batch.sensor_summary.avg_humidity}%` : 'N/A');
                    this._row(doc, 'Avg CO₂', batch.sensor_summary.avg_co2 ? `${batch.sensor_summary.avg_co2} ppm` : 'N/A');
                    this._row(doc, 'Avg VOC', batch.sensor_summary.avg_voc ? `${batch.sensor_summary.avg_voc}` : 'N/A');
                    this._row(doc, 'Last Updated', batch.sensor_summary.last_updated ? new Date(batch.sensor_summary.last_updated).toLocaleString() : 'N/A');
                }

                // ====== RISK ASSESSMENT ======
                this._sectionHeader(doc, 'Risk Assessment');
                this._row(doc, 'Risk Score', `${batch.risk_score || 0}/100`);
                this._row(doc, 'Spoilage Label', batch.spoilage_label || 'Safe');
                this._row(doc, 'AI Confidence', batch.ai_prediction_confidence ? `${(batch.ai_prediction_confidence * 100).toFixed(1)}%` : 'N/A');
                this._row(doc, 'Last Assessment', batch.last_risk_assessment ? new Date(batch.last_risk_assessment).toLocaleString() : 'N/A');

                // ====== SPOILAGE EVENTS ======
                if (batch.spoilage_events && batch.spoilage_events.length > 0) {
                    doc.addPage();
                    this._sectionHeader(doc, `Spoilage Events (${batch.spoilage_events.length})`);
                    batch.spoilage_events.forEach((event, idx) => {
                        doc.fontSize(11).fillColor('#c0392b').text(`Event ${idx + 1}: ${event.event_type} - ${event.severity}`, { underline: true });
                        doc.fontSize(9).fillColor('#555');
                        doc.text(`Description: ${event.description || 'N/A'}`);
                        doc.text(`Estimated Loss: ${event.estimated_loss_kg || 0} kg`);
                        doc.text(`Estimated Value Loss: PKR ${event.estimated_value_loss || 0}`);
                        doc.text(`Detected: ${event.detected_date ? new Date(event.detected_date).toLocaleString() : 'N/A'}`);
                        if (event.environmental_conditions) {
                            doc.text(`Temperature: ${event.environmental_conditions.temperature || 'N/A'}°C, Humidity: ${event.environmental_conditions.humidity || 'N/A'}%`);
                        }
                        doc.moveDown(0.5);
                    });
                }

                // ====== DISPATCH & FINANCIAL ======
                this._sectionHeader(doc, 'Financial Summary');
                this._row(doc, 'Purchase Price/kg', batch.purchase_price_per_kg ? `PKR ${batch.purchase_price_per_kg}` : 'N/A');
                this._row(doc, 'Total Purchase Value', batch.total_purchase_value ? `PKR ${batch.total_purchase_value.toLocaleString()}` : 'N/A');
                this._row(doc, 'Sell Price/kg', batch.sell_price_per_kg ? `PKR ${batch.sell_price_per_kg}` : 'N/A');
                this._row(doc, 'Dispatched Quantity', `${batch.dispatched_quantity_kg || 0} kg`);
                this._row(doc, 'Revenue', batch.revenue ? `PKR ${batch.revenue.toLocaleString()}` : 'N/A');
                this._row(doc, 'Profit', batch.profit ? `PKR ${batch.profit.toLocaleString()}` : 'N/A');

                // ====== DISPATCH INFO ======
                if (batch.dispatch_details) {
                    this._sectionHeader(doc, 'Dispatch Details');
                    this._row(doc, 'Vehicle', batch.dispatch_details.vehicle_number || 'N/A');
                    this._row(doc, 'Driver', batch.dispatch_details.driver_name || 'N/A');
                    this._row(doc, 'Destination', batch.dispatch_details.destination || 'N/A');
                    this._row(doc, 'Dispatch Date', batch.actual_dispatch_date ? new Date(batch.actual_dispatch_date).toLocaleDateString() : 'N/A');
                }

                // ====== ACTIVITY TIMELINE ======
                if (activityLogs.length > 0) {
                    doc.addPage();
                    this._sectionHeader(doc, `Event Timeline (${activityLogs.length} events)`);
                    activityLogs.forEach((log) => {
                        const date = new Date(log.created_at).toLocaleString();
                        const icon = this._getLogIcon(log.category);
                        doc.fontSize(9).fillColor('#1a7a3a').text(`${icon} ${date}`, { continued: true });
                        doc.fillColor('#333').text(` - ${log.description}`);
                        doc.fontSize(8).fillColor('#999').text(`By: ${log.user_name || 'System'} (${log.user_role || 'system'})`);
                        doc.moveDown(0.3);
                    });
                }

                // ====== QR CODE ======
                if (batch.qr_code) {
                    try {
                        const qrDataUrl = await QRCode.toDataURL(batch.qr_code, { width: 120 });
                        const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, '');
                        doc.addPage();
                        this._sectionHeader(doc, 'QR Code');
                        doc.image(Buffer.from(qrImage, 'base64'), { width: 120, height: 120 });
                        doc.moveDown();
                        doc.fontSize(8).fillColor('#999').text(`QR: ${batch.qr_code}`);
                    } catch (qrError) {
                        console.error('QR code generation for PDF failed:', qrError.message);
                    }
                }

                // ====== FOOTER ======
                doc.fontSize(8).fillColor('#aaa').text(
                    'This report was auto-generated by GrainHero Traceability System. All data is for reference and compliance purposes.',
                    50, doc.page.height - 50,
                    { align: 'center', width: 495 }
                );

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate a buyer invoice PDF
     * Returns a Buffer
     */
    static async generateInvoicePDF(invoice) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const buffers = [];

                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // ====== HEADER ======
                doc.rect(0, 0, 595, 80).fill('#1a7a3a');
                doc.fontSize(22).fillColor('#ffffff').text('INVOICE', 50, 20);
                doc.fontSize(10).fillColor('#d4edda').text(`#${invoice.invoice_number}`, 50, 48);
                doc.fontSize(10).text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 25, { align: 'right' });
                if (invoice.due_date) {
                    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 400, 40, { align: 'right' });
                }

                doc.fillColor('#333');
                doc.moveDown(4);

                // ====== BILL TO ======
                doc.fontSize(12).fillColor('#1a7a3a').text('Bill To:');
                doc.fontSize(10).fillColor('#333');
                doc.text(invoice.buyer_name || 'N/A');
                if (invoice.buyer_company) doc.text(invoice.buyer_company);
                if (invoice.buyer_contact) {
                    if (invoice.buyer_contact.address) doc.text(invoice.buyer_contact.address);
                    if (invoice.buyer_contact.email) doc.text(`Email: ${invoice.buyer_contact.email}`);
                    if (invoice.buyer_contact.phone) doc.text(`Phone: ${invoice.buyer_contact.phone}`);
                }

                doc.moveDown();
                doc.text(`Batch Ref: ${invoice.batch_ref || 'N/A'}`);

                doc.moveDown(1.5);

                // ====== TABLE HEADER ======
                const tableTop = doc.y;
                doc.rect(50, tableTop, 495, 25).fill('#f0f5f0');
                doc.fontSize(9).fillColor('#1a7a3a');
                doc.text('Description', 55, tableTop + 7, { width: 180 });
                doc.text('Grain', 240, tableTop + 7, { width: 60 });
                doc.text('Qty (kg)', 305, tableTop + 7, { width: 60, align: 'right' });
                doc.text('Rate/kg', 375, tableTop + 7, { width: 60, align: 'right' });
                doc.text('Amount', 445, tableTop + 7, { width: 90, align: 'right' });

                // ====== TABLE ROWS ======
                let y = tableTop + 30;
                doc.fillColor('#333');

                if (invoice.items && invoice.items.length > 0) {
                    invoice.items.forEach((item) => {
                        doc.fontSize(9);
                        doc.text(item.description || 'Grain Dispatch', 55, y, { width: 180 });
                        doc.text(item.grain_type || '-', 240, y, { width: 60 });
                        doc.text((item.quantity_kg || 0).toLocaleString(), 305, y, { width: 60, align: 'right' });
                        doc.text(`${invoice.currency} ${(item.price_per_kg || 0).toLocaleString()}`, 375, y, { width: 60, align: 'right' });
                        doc.text(`${invoice.currency} ${(item.amount || 0).toLocaleString()}`, 445, y, { width: 90, align: 'right' });
                        y += 22;
                    });
                }

                // ====== TOTALS ======
                y += 10;
                doc.moveTo(350, y).lineTo(545, y).stroke('#ccc');
                y += 10;
                doc.fontSize(10).fillColor('#333');
                doc.text('Subtotal:', 350, y, { width: 90, align: 'right' });
                doc.text(`${invoice.currency} ${(invoice.subtotal || 0).toLocaleString()}`, 445, y, { width: 90, align: 'right' });

                y += 25;
                doc.rect(345, y - 5, 200, 25).fill('#1a7a3a');
                doc.fontSize(12).fillColor('#fff');
                doc.text('TOTAL:', 350, y, { width: 90, align: 'right' });
                doc.text(`${invoice.currency} ${(invoice.total_amount || 0).toLocaleString()}`, 445, y, { width: 90, align: 'right' });

                // ====== PAYMENT STATUS ======
                doc.moveDown(3);
                doc.fillColor('#333');
                const statusColor = invoice.payment_status === 'paid' ? '#27ae60' : '#e74c3c';
                doc.fontSize(11).fillColor(statusColor).text(`Payment Status: ${(invoice.payment_status || 'unpaid').toUpperCase()}`, 50);

                if (invoice.amount_paid > 0) {
                    doc.fontSize(9).fillColor('#555').text(`Amount Paid: ${invoice.currency} ${invoice.amount_paid.toLocaleString()}`);
                }

                // ====== NOTES ======
                if (invoice.notes) {
                    doc.moveDown();
                    doc.fontSize(9).fillColor('#1a7a3a').text('Notes:');
                    doc.fillColor('#555').text(invoice.notes);
                }

                // ====== FOOTER ======
                doc.fontSize(8).fillColor('#aaa').text(
                    'Thank you for your business! - GrainHero',
                    50, doc.page.height - 50,
                    { align: 'center', width: 495 }
                );

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // ====== Helpers ======
    static _sectionHeader(doc, title) {
        doc.moveDown(0.8);
        doc.fontSize(13).fillColor('#1a7a3a').text(title, { underline: true });
        doc.moveDown(0.3);
    }

    static _row(doc, label, value) {
        doc.fontSize(9).fillColor('#666').text(`${label}: `, { continued: true });
        doc.fillColor('#333').text(String(value || 'N/A'));
    }

    static _getLogIcon(category) {
        const icons = {
            batch: '📦',
            spoilage: '⚠️',
            buyer: '🤝',
            dispatch: '🚚',
            payment: '💰',
            insurance: '🛡️',
            invoice: '📄',
            report: '📊',
            system: '⚙️'
        };
        return icons[category] || '•';
    }
}

module.exports = PDFService;
