/**
 * Mock Station Client for End-to-End Testing
 * 
 * Simulates a remote station with dummy nodes for comprehensive P2P testing.
 * Features:
 * - Simulated nodes with automatic responses
 * - Bridge protocol compliance
 * - Configurable response behavior
 */

import { EventEmitter } from 'events';
import { BridgeMessage, MessageType, MessagePriority, createBridgeMessage } from '../bridge/protocol.js';
import { CryptoService } from '../crypto.js';
import { StationConfig } from '../config/types.js';

export interface MockNodeConfig {
    nodeId: number;
    nodeName: string;
    autoRespond: boolean;
    responseDelay: number; // milliseconds
    responseMessage?: string;
}

export interface MockStationConfig {
    stationId: string;
    stationName: string;
    listenPort: number;
    nodes: MockNodeConfig[];
    responsePattern: 'echo' | 'ack' | 'custom';
}

export interface MockPeerInfo {
    stationId: string;
    host: string;
    port: number;
    publicKey: string;
}

export class MockStation extends EventEmitter {
    private config: MockStationConfig;
    private cryptoService: CryptoService;
    private isRunning: boolean = false;
    private messageCount: number = 0;
    private responses: Map<number, string> = new Map();
    private connectedPeers: Map<string, MockPeerInfo> = new Map();

    constructor(config: MockStationConfig) {
        super();
        this.config = config;
        
        // Initialize crypto service
        this.cryptoService = new CryptoService();
        
        this.setupDefaultResponses();
    }

    private setupDefaultResponses(): void {
        // Set up default response patterns
        for (const node of this.config.nodes) {
            if (node.responseMessage) {
                this.responses.set(node.nodeId, node.responseMessage);
            } else {
                // Default responses based on pattern
                switch (this.config.responsePattern) {
                    case 'echo':
                        this.responses.set(node.nodeId, 'Echo from {nodeName}: {originalMessage}');
                        break;
                    case 'ack':
                        this.responses.set(node.nodeId, 'ACK from {nodeName} - Message received');
                        break;
                    case 'custom':
                        this.responses.set(node.nodeId, `Custom response from ${node.nodeName}`);
                        break;
                }
            }
        }
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Mock station is already running');
        }

        try {
            console.log(`[MockStation ${this.config.stationId}] Starting mock station...`);

            // Initialize crypto service
            await this.initializeCrypto();

            this.isRunning = true;
            this.emit('started');
            
            console.log(`[MockStation ${this.config.stationId}] Mock station started successfully`);
            console.log(`[MockStation ${this.config.stationId}] Available nodes: ${this.config.nodes.map(n => n.nodeName).join(', ')}`);

        } catch (error) {
            console.error(`[MockStation ${this.config.stationId}] Failed to start:`, error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log(`[MockStation ${this.config.stationId}] Stopping mock station...`);

        try {
            this.connectedPeers.clear();
            this.isRunning = false;
            this.emit('stopped');
            
            console.log(`[MockStation ${this.config.stationId}] Mock station stopped`);

        } catch (error) {
            console.error(`[MockStation ${this.config.stationId}] Error during stop:`, error);
            throw error;
        }
    }

    private async initializeCrypto(): Promise<void> {
        // Initialize with test keys or generate new ones
        try {
            // For testing purposes, we'll use fixed test keys or generate new ones
            console.log(`[MockStation ${this.config.stationId}] Initializing crypto service...`);
        } catch (error) {
            console.error(`[MockStation ${this.config.stationId}] Crypto initialization failed:`, error);
            throw error;
        }
    }

    public async handleIncomingMessage(message: BridgeMessage): Promise<BridgeMessage | null> {
        if (!this.isRunning) {
            throw new Error('Mock station is not running');
        }

        this.messageCount++;
        
        console.log(`[MockStation ${this.config.stationId}] Received message ${this.messageCount}:`, {
            messageId: message.messageId,
            type: message.payload.type,
            fromStation: message.routing.fromStation,
            toNode: message.routing.toNode,
            data: message.payload.data
        });

        this.emit('messageReceived', message);

        // Handle different message types
        switch (message.payload.type) {
            case MessageType.USER_MESSAGE:
                return await this.handleUserMessage(message);
            case MessageType.COMMAND:
                return await this.handleCommandMessage(message);
            case MessageType.SYSTEM:
                return await this.handleSystemMessage(message);
            case MessageType.HEARTBEAT:
                return await this.handleHeartbeat(message);
            default:
                console.log(`[MockStation ${this.config.stationId}] Unhandled message type: ${message.payload.type}`);
                return null;
        }
    }

    private async handleUserMessage(message: BridgeMessage): Promise<BridgeMessage | null> {
        const targetNode = this.config.nodes.find(n => n.nodeId === message.routing.toNode);
        
        if (!targetNode) {
            // Send error response for unknown node
            return this.createErrorResponse(message, `Node ${message.routing.toNode} not found`);
        }

        if (targetNode.autoRespond) {
            // Schedule automatic response after delay
            return new Promise((resolve) => {
                setTimeout(async () => {
                    const response = await this.createAutoResponse(targetNode, message);
                    resolve(response);
                }, targetNode.responseDelay);
            });
        }

        return null;
    }

    private async handleCommandMessage(message: BridgeMessage): Promise<BridgeMessage | null> {
        const commandData = JSON.parse(message.payload.data);
        const command = commandData.command;
        
        switch (command) {
            case 'ping':
                return this.createPingResponse(message);
            case 'status':
                return this.createStatusResponse(message);
            case 'nodes':
                return this.createNodeListResponse(message);
            default:
                return this.createErrorResponse(message, `Unknown command: ${command}`);
        }
    }

    private async handleSystemMessage(message: BridgeMessage): Promise<BridgeMessage | null> {
        try {
            const systemData = JSON.parse(message.payload.data);
            console.log(`[MockStation ${this.config.stationId}] Received system message:`, systemData.type);
            
            switch (systemData.type) {
                case 'NODE_LIST_REQUEST':
                    return await this.createNodeDiscoveryResponse(message);
                default:
                    console.log(`[MockStation ${this.config.stationId}] Unhandled system message type: ${systemData.type}`);
                    return null;
            }
        } catch (error) {
            console.error(`[MockStation ${this.config.stationId}] Error handling system message:`, error);
            return null;
        }
    }

    private async handleHeartbeat(message: BridgeMessage): Promise<BridgeMessage | null> {
        // Respond to heartbeat with our own heartbeat
        return createBridgeMessage(
            this.config.stationId,
            message.routing.fromStation,
            0, // Station heartbeat
            0,
            MessageType.HEARTBEAT,
            JSON.stringify({
                stationId: this.config.stationId,
                timestamp: Date.now(),
                nodeCount: this.config.nodes.length
            }),
            { priority: MessagePriority.NORMAL, ttl: 300 }
        );
    }

    private async createAutoResponse(node: MockNodeConfig, originalMessage: BridgeMessage): Promise<BridgeMessage> {
        const responseTemplate = this.responses.get(node.nodeId) || 'Default response from {nodeName}';
        
        const responseText = responseTemplate
            .replace('{nodeName}', node.nodeName)
            .replace('{nodeId}', node.nodeId.toString())
            .replace('{originalMessage}', JSON.parse(originalMessage.payload.data).text || originalMessage.payload.data);

        const response = createBridgeMessage(
            this.config.stationId,
            originalMessage.routing.fromStation,
            node.nodeId,
            originalMessage.routing.fromNode,
            MessageType.USER_MESSAGE,
            JSON.stringify({
                text: responseText,
                fromNodeName: node.nodeName
            }),
            { priority: MessagePriority.NORMAL, ttl: 3600 }
        );

        console.log(`[MockStation ${this.config.stationId}] Auto-response from ${node.nodeName}: "${responseText}"`);
        this.emit('responseSent', response, originalMessage);

        return response;
    }

    private createPingResponse(message: BridgeMessage): BridgeMessage {
        return createBridgeMessage(
            this.config.stationId,
            message.routing.fromStation,
            0,
            message.routing.fromNode,
            MessageType.COMMAND,
            JSON.stringify({
                command: 'ping',
                result: 'pong',
                timestamp: Date.now(),
                stationInfo: {
                    stationId: this.config.stationId,
                    stationName: this.config.stationName,
                    nodeCount: this.config.nodes.length
                }
            }),
            { priority: MessagePriority.HIGH, ttl: 60 }
        );
    }

    private createStatusResponse(message: BridgeMessage): BridgeMessage {
        return createBridgeMessage(
            this.config.stationId,
            message.routing.fromStation,
            0,
            message.routing.fromNode,
            MessageType.COMMAND,
            JSON.stringify({
                command: 'status',
                result: {
                    stationId: this.config.stationId,
                    stationName: this.config.stationName,
                    isRunning: this.isRunning,
                    messageCount: this.messageCount,
                    nodeCount: this.config.nodes.length,
                    uptime: process.uptime(),
                    timestamp: Date.now()
                }
            }),
            { priority: MessagePriority.NORMAL, ttl: 300 }
        );
    }

    private createNodeListResponse(message: BridgeMessage): BridgeMessage {
        const nodeList = this.config.nodes.map(node => ({
            nodeId: node.nodeId,
            nodeName: node.nodeName,
            lastSeen: Date.now(),
            isOnline: true
        }));

        return createBridgeMessage(
            this.config.stationId,
            message.routing.fromStation,
            0,
            message.routing.fromNode,
            MessageType.COMMAND,
            JSON.stringify({
                command: 'nodes',
                result: { nodes: nodeList }
            }),
            { priority: MessagePriority.NORMAL, ttl: 300 }
        );
    }

    private createNodeDiscoveryResponse(message: BridgeMessage): BridgeMessage {
        // Create node discovery response for system message
        const nodeList = this.config.nodes.map(node => ({
            nodeId: node.nodeId,
            nodeName: node.nodeName,
            lastSeen: Date.now(),
            isOnline: true,
            stationId: this.config.stationId
        }));

        console.log(`[MockStation ${this.config.stationId}] Sending node discovery response with ${nodeList.length} nodes`);

        return createBridgeMessage(
            this.config.stationId,
            message.routing.fromStation,
            0,
            0,
            MessageType.NODE_DISCOVERY,
            JSON.stringify({
                type: 'NODE_LIST_RESPONSE',
                requestId: JSON.parse(message.payload.data).requestId,
                nodes: nodeList,
                stationId: this.config.stationId,
                timestamp: Date.now()
            }),
            { priority: MessagePriority.NORMAL, ttl: 300 }
        );
    }

    private createErrorResponse(message: BridgeMessage, error: string): BridgeMessage {
        return createBridgeMessage(
            this.config.stationId,
            message.routing.fromStation,
            0,
            message.routing.fromNode,
            MessageType.ERROR,
            JSON.stringify({
                error: error,
                originalMessageId: message.messageId
            }),
            { priority: MessagePriority.HIGH, ttl: 300 }
        );
    }

    // Public methods for testing control
    public addNode(nodeConfig: MockNodeConfig): void {
        this.config.nodes.push(nodeConfig);
        this.setupDefaultResponses();
        console.log(`[MockStation ${this.config.stationId}] Added node: ${nodeConfig.nodeName}`);
    }

    public removeNode(nodeId: number): void {
        this.config.nodes = this.config.nodes.filter(n => n.nodeId !== nodeId);
        this.responses.delete(nodeId);
        console.log(`[MockStation ${this.config.stationId}] Removed node: ${nodeId}`);
    }

    public setNodeResponse(nodeId: number, responseMessage: string): void {
        this.responses.set(nodeId, responseMessage);
        console.log(`[MockStation ${this.config.stationId}] Updated response for node ${nodeId}`);
    }

    public getStats(): any {
        return {
            stationId: this.config.stationId,
            stationName: this.config.stationName,
            isRunning: this.isRunning,
            messageCount: this.messageCount,
            nodeCount: this.config.nodes.length,
            connectedPeers: this.connectedPeers.size,
            uptime: process.uptime()
        };
    }

    public getNodes(): MockNodeConfig[] {
        return [...this.config.nodes];
    }

    public isNodeAvailable(nodeId: number): boolean {
        return this.config.nodes.some(n => n.nodeId === nodeId);
    }

    // Utility method to create test messages
    public createTestMessage(targetStationId: string, targetNodeId: number, messageText: string): BridgeMessage {
        if (!this.isRunning) {
            throw new Error('Mock station is not running');
        }

        const sourceNode = this.config.nodes[0] || { nodeId: 1, nodeName: 'Mock Node 1' };

        return createBridgeMessage(
            this.config.stationId,
            targetStationId,
            sourceNode.nodeId,
            targetNodeId,
            MessageType.USER_MESSAGE,
            JSON.stringify({
                text: messageText,
                fromNodeName: sourceNode.nodeName
            }),
            { priority: MessagePriority.NORMAL, ttl: 3600 }
        );
    }

    public connectToPeer(peerInfo: MockPeerInfo): void {
        this.connectedPeers.set(peerInfo.stationId, peerInfo);
        this.emit('peerConnected', peerInfo);
        console.log(`[MockStation ${this.config.stationId}] Connected to peer: ${peerInfo.stationId}`);
    }

    public disconnectFromPeer(stationId: string): void {
        this.connectedPeers.delete(stationId);
        this.emit('peerDisconnected', stationId);
        console.log(`[MockStation ${this.config.stationId}] Disconnected from peer: ${stationId}`);
    }
}
