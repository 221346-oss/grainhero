const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const SensorReading = require('../models/SensorReading');
const Actuator = require('../models/Actuator');
const { v4: uuidv4 } = require('uuid');

class OfflineDataService extends EventEmitter {
    constructor() {
        super();
        this.bufferDirectory = path.join(__dirname, '../data/offline_buffer');
        this.maxBufferSize = 10000; // Maximum readings per device
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 30 * 1000; // 30 seconds
        
        this.initializeBufferDirectory();
        this.startSyncProcess();
    }

    /**
     * Initialize buffer directory
     */
    async initializeBufferDirectory() {
        try {
            await fs.mkdir(this.bufferDirectory, { recursive: true });
            console.log('Offline buffer directory initialized');
        } catch (error) {
            console.error('Failed to initialize buffer directory:', error);
        }
    }

    /**
     * Buffer sensor reading when device is offline
     */
    async bufferSensorReading(deviceId, readingData) {
        try {
            const bufferFile = path.join(this.bufferDirectory, `sensor_${deviceId}.json`);
            
            // Load existing buffer
            let buffer = [];
            try {
                const data = await fs.readFile(bufferFile, 'utf8');
                buffer = JSON.parse(data);
            } catch (error) {
                // File doesn't exist or is empty, start with empty buffer
                buffer = [];
            }

            // Add new reading with metadata
            const bufferedReading = {
                id: uuidv4(),
                device_id: deviceId,
                reading_data: readingData,
                buffered_at: new Date().toISOString(),
                retry_count: 0,
                priority: this.calculatePriority(readingData)
            };

            buffer.push(bufferedReading);

            // Limit buffer size
            if (buffer.length > this.maxBufferSize) {
                buffer = buffer.slice(-this.maxBufferSize);
            }

            // Save buffer to file
            await fs.writeFile(bufferFile, JSON.stringify(buffer, null, 2));

            this.emit('readingBuffered', { deviceId, readingId: bufferedReading.id });

            console.log(`Buffered reading for device ${deviceId}, buffer size: ${buffer.length}`);

        } catch (error) {
            console.error('Buffer sensor reading error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Buffer actuator command when device is offline
     */
    async bufferActuatorCommand(actuatorId, commandData) {
        try {
            const bufferFile = path.join(this.bufferDirectory, `actuator_${actuatorId}.json`);
            
            // Load existing buffer
            let buffer = [];
            try {
                const data = await fs.readFile(bufferFile, 'utf8');
                buffer = JSON.parse(data);
            } catch (error) {
                buffer = [];
            }

            // Add new command with metadata
            const bufferedCommand = {
                id: uuidv4(),
                actuator_id: actuatorId,
                command_data: commandData,
                buffered_at: new Date().toISOString(),
                retry_count: 0,
                priority: this.calculateCommandPriority(commandData)
            };

            buffer.push(bufferedCommand);

            // Limit buffer size
            if (buffer.length > this.maxBufferSize) {
                buffer = buffer.slice(-this.maxBufferSize);
            }

            // Save buffer to file
            await fs.writeFile(bufferFile, JSON.stringify(buffer, null, 2));

            this.emit('commandBuffered', { actuatorId, commandId: bufferedCommand.id });

            console.log(`Buffered command for actuator ${actuatorId}, buffer size: ${buffer.length}`);

        } catch (error) {
            console.error('Buffer actuator command error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Sync buffered data when device comes online
     */
    async syncBufferedData(deviceId, deviceType = 'sensor') {
        try {
            const bufferFile = path.join(this.bufferDirectory, `${deviceType}_${deviceId}.json`);
            
            // Check if buffer file exists
            try {
                await fs.access(bufferFile);
            } catch (error) {
                // No buffered data
                return { synced: 0, failed: 0 };
            }

            // Load buffer
            const data = await fs.readFile(bufferFile, 'utf8');
            const buffer = JSON.parse(data);

            if (buffer.length === 0) {
                return { synced: 0, failed: 0 };
            }

            console.log(`Syncing ${buffer.length} buffered items for ${deviceType} ${deviceId}`);

            let synced = 0;
            let failed = 0;
            const failedItems = [];

            // Process each buffered item
            for (const item of buffer) {
                try {
                    if (deviceType === 'sensor') {
                        await this.syncSensorReading(item);
                    } else if (deviceType === 'actuator') {
                        await this.syncActuatorCommand(item);
                    }
                    synced++;
                } catch (error) {
                    console.error(`Failed to sync ${deviceType} item ${item.id}:`, error);
                    failed++;
                    
                    // Increment retry count
                    item.retry_count = (item.retry_count || 0) + 1;
                    
                    // Keep item if retry count is below limit
                    if (item.retry_count < this.retryAttempts) {
                        failedItems.push(item);
                    }
                }
            }

            // Update buffer with failed items
            if (failedItems.length > 0) {
                await fs.writeFile(bufferFile, JSON.stringify(failedItems, null, 2));
            } else {
                // Remove buffer file if all items synced
                await fs.unlink(bufferFile);
            }

            this.emit('dataSynced', { deviceId, deviceType, synced, failed });

            return { synced, failed };

        } catch (error) {
            console.error('Sync buffered data error:', error);
            this.emit('error', error);
            return { synced: 0, failed: 0 };
        }
    }

    /**
     * Sync individual sensor reading
     */
    async syncSensorReading(bufferedItem) {
        try {
            const reading = new SensorReading({
                ...bufferedItem.reading_data,
                buffered_from: bufferedItem.id,
                synced_at: new Date()
            });

            await reading.save();
            console.log(`Synced sensor reading ${bufferedItem.id}`);

        } catch (error) {
            console.error('Sync sensor reading error:', error);
            throw error;
        }
    }

    /**
     * Sync individual actuator command
     */
    async syncActuatorCommand(bufferedItem) {
        try {
            const { actuator_id, action, parameters } = bufferedItem.command_data;
            
            const actuator = await Actuator.findById(actuator_id);
            if (!actuator) {
                throw new Error(`Actuator ${actuator_id} not found`);
            }

            // Execute the buffered command
            let result;
            switch (action) {
                case 'on':
                    result = await actuator.startOperation('System', 'manual');
                    break;
                case 'off':
                    result = await actuator.stopOperation();
                    break;
                case 'set_power':
                    actuator.power_level = parameters.power_level;
                    if (parameters.power_level > 0 && !actuator.is_on) {
                        result = await actuator.startOperation('System', 'manual');
                    } else if (parameters.power_level === 0 && actuator.is_on) {
                        result = await actuator.stopOperation();
                    }
                    break;
            }

            console.log(`Synced actuator command ${bufferedItem.id}: ${action}`);

        } catch (error) {
            console.error('Sync actuator command error:', error);
            throw error;
        }
    }

    /**
     * Start periodic sync process
     */
    startSyncProcess() {
        setInterval(async () => {
            try {
                await this.processAllBuffers();
            } catch (error) {
                console.error('Periodic sync process error:', error);
            }
        }, this.syncInterval);
    }

    /**
     * Process all buffer files
     */
    async processAllBuffers() {
        try {
            const files = await fs.readdir(this.bufferDirectory);
            const bufferFiles = files.filter(file => file.endsWith('.json'));

            for (const file of bufferFiles) {
                try {
                    const filePath = path.join(this.bufferDirectory, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const buffer = JSON.parse(data);

                    if (buffer.length === 0) continue;

                    // Extract device ID and type from filename
                    const [deviceType, deviceId] = file.replace('.json', '').split('_');
                    
                    // Check if device is online
                    const isOnline = await this.checkDeviceOnline(deviceId, deviceType);
                    
                    if (isOnline) {
                        console.log(`Device ${deviceId} is online, syncing buffered data`);
                        await this.syncBufferedData(deviceId, deviceType);
                    }

                } catch (error) {
                    console.error(`Error processing buffer file ${file}:`, error);
                }
            }
        } catch (error) {
            console.error('Process all buffers error:', error);
        }
    }

    /**
     * Check if device is online
     */
    async checkDeviceOnline(deviceId, deviceType) {
        try {
            if (deviceType === 'sensor') {
                const device = await SensorDevice.findById(deviceId);
                if (!device) return false;
                
                const now = new Date();
                const lastHeartbeat = device.health_metrics?.last_heartbeat;
                if (!lastHeartbeat) return false;
                
                const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
                return minutesSinceHeartbeat < 10; // Consider online if heartbeat within 10 minutes
                
            } else if (deviceType === 'actuator') {
                const device = await Actuator.findById(deviceId);
                if (!device) return false;
                
                const now = new Date();
                const lastHeartbeat = device.health_metrics?.last_heartbeat;
                if (!lastHeartbeat) return false;
                
                const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
                return minutesSinceHeartbeat < 15; // Consider online if heartbeat within 15 minutes
            }
            
            return false;
        } catch (error) {
            console.error('Check device online error:', error);
            return false;
        }
    }

    /**
     * Calculate priority for buffered reading
     */
    calculatePriority(readingData) {
        let priority = 1; // Default priority
        
        // Higher priority for critical readings
        if (readingData.temperature?.value > 40 || readingData.temperature?.value < 0) priority += 3;
        if (readingData.humidity?.value > 80 || readingData.humidity?.value < 10) priority += 2;
        if (readingData.co2?.value > 1000) priority += 2;
        if (readingData.voc?.value > 500) priority += 1;
        
        // Higher priority for anomaly readings
        if (readingData.quality_indicators?.anomaly_detected) priority += 2;
        
        return Math.min(priority, 5); // Max priority 5
    }

    /**
     * Calculate priority for buffered command
     */
    calculateCommandPriority(commandData) {
        let priority = 1; // Default priority
        
        // Higher priority for emergency commands
        if (commandData.action === 'emergency_shutdown') priority = 5;
        if (commandData.action === 'alarm') priority = 4;
        if (commandData.action === 'on' || commandData.action === 'off') priority = 2;
        
        return Math.min(priority, 5); // Max priority 5
    }

    /**
     * Get buffer statistics
     */
    async getBufferStatistics() {
        try {
            const files = await fs.readdir(this.bufferDirectory);
            const bufferFiles = files.filter(file => file.endsWith('.json'));

            let totalBuffered = 0;
            let deviceCount = 0;
            const deviceStats = [];

            for (const file of bufferFiles) {
                try {
                    const filePath = path.join(this.bufferDirectory, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const buffer = JSON.parse(data);

                    const [deviceType, deviceId] = file.replace('.json', '').split('_');
                    
                    deviceCount++;
                    totalBuffered += buffer.length;
                    
                    deviceStats.push({
                        device_id: deviceId,
                        device_type: deviceType,
                        buffered_count: buffer.length,
                        oldest_item: buffer.length > 0 ? buffer[0].buffered_at : null,
                        newest_item: buffer.length > 0 ? buffer[buffer.length - 1].buffered_at : null
                    });

                } catch (error) {
                    console.error(`Error reading buffer file ${file}:`, error);
                }
            }

            return {
                total_buffered_items: totalBuffered,
                devices_with_buffered_data: deviceCount,
                device_statistics: deviceStats
            };

        } catch (error) {
            console.error('Get buffer statistics error:', error);
            return {
                total_buffered_items: 0,
                devices_with_buffered_data: 0,
                device_statistics: []
            };
        }
    }

    /**
     * Clean up old buffered data
     */
    async cleanupOldData(maxAgeHours = 24) {
        try {
            const files = await fs.readdir(this.bufferDirectory);
            const bufferFiles = files.filter(file => file.endsWith('.json'));

            let cleanedItems = 0;

            for (const file of bufferFiles) {
                try {
                    const filePath = path.join(this.bufferDirectory, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const buffer = JSON.parse(data);

                    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
                    const filteredBuffer = buffer.filter(item => 
                        new Date(item.buffered_at) > cutoffTime
                    );

                    if (filteredBuffer.length !== buffer.length) {
                        cleanedItems += buffer.length - filteredBuffer.length;
                        
                        if (filteredBuffer.length > 0) {
                            await fs.writeFile(filePath, JSON.stringify(filteredBuffer, null, 2));
                        } else {
                            await fs.unlink(filePath);
                        }
                    }

                } catch (error) {
                    console.error(`Error cleaning buffer file ${file}:`, error);
                }
            }

            console.log(`Cleaned up ${cleanedItems} old buffered items`);
            return cleanedItems;

        } catch (error) {
            console.error('Cleanup old data error:', error);
            return 0;
        }
    }

    /**
     * Force sync all buffered data (for testing/admin purposes)
     */
    async forceSyncAll() {
        try {
            const files = await fs.readdir(this.bufferDirectory);
            const bufferFiles = files.filter(file => file.endsWith('.json'));

            let totalSynced = 0;
            let totalFailed = 0;

            for (const file of bufferFiles) {
                try {
                    const [deviceType, deviceId] = file.replace('.json', '').split('_');
                    const result = await this.syncBufferedData(deviceId, deviceType);
                    totalSynced += result.synced;
                    totalFailed += result.failed;
                } catch (error) {
                    console.error(`Error force syncing ${file}:`, error);
                }
            }

            console.log(`Force sync completed: ${totalSynced} synced, ${totalFailed} failed`);
            return { synced: totalSynced, failed: totalFailed };

        } catch (error) {
            console.error('Force sync all error:', error);
            return { synced: 0, failed: 0 };
        }
    }
}

module.exports = new OfflineDataService();
