#!/usr/bin/env tsx

/**
 * Quick Mock Station Demo
 * Tests the mock station functionality directly without complex imports
 */

import { BridgeMessage, MessageType, createBridgeMessage, MessagePriority } from '../bridge/protocol.js';

// Simple mock station implementation for demo
class SimpleMockStation {
    private stationId: string;
    private nodes: Array<{ nodeId: number; nodeName: string }>;
    private messageCount: number = 0;

    constructor(stationId: string) {
        this.stationId = stationId;
        this.nodes = [
            { nodeId: 1001, nodeName: 'Demo Node Alpha' },
            { nodeId: 1002, nodeName: 'Demo Node Beta' }
        ];
    }

    public async handleMessage(message: BridgeMessage): Promise<BridgeMessage | null> {
        this.messageCount++;
        
        console.log(`📨 [${this.stationId}] Received message ${this.messageCount}:`, {
            type: message.payload.type,
            fromStation: message.routing.fromStation,
            toNode: message.routing.toNode,
            data: message.payload.data
        });

        // Handle different message types
        switch (message.payload.type) {
            case MessageType.USER_MESSAGE:
                return this.handleUserMessage(message);
            case MessageType.COMMAND:
                return this.handleCommand(message);
            default:
                console.log(`❓ [${this.stationId}] Unknown message type: ${message.payload.type}`);
                return null;
        }
    }

    private handleUserMessage(message: BridgeMessage): BridgeMessage {
        const targetNode = this.nodes.find(n => n.nodeId === message.routing.toNode);
        
        if (!targetNode) {
            // Error response for unknown node
            return createBridgeMessage(
                this.stationId,
                message.routing.fromStation,
                0,
                message.routing.fromNode,
                MessageType.ERROR,
                JSON.stringify({
                    error: `Node ${message.routing.toNode} not found`,
                    originalMessageId: message.messageId
                })
            );
        }

        // Echo response
        const originalData = JSON.parse(message.payload.data);
        const responseText = `Echo from ${targetNode.nodeName}: ${originalData.text}`;

        return createBridgeMessage(
            this.stationId,
            message.routing.fromStation,
            targetNode.nodeId,
            message.routing.fromNode,
            MessageType.USER_MESSAGE,
            JSON.stringify({
                text: responseText,
                fromNodeName: targetNode.nodeName
            })
        );
    }

    private handleCommand(message: BridgeMessage): BridgeMessage {
        const commandData = JSON.parse(message.payload.data);
        const command = commandData.command;

        let responseData: any;

        switch (command) {
            case 'ping':
                responseData = {
                    command: 'ping',
                    result: 'pong',
                    timestamp: Date.now(),
                    stationInfo: {
                        stationId: this.stationId,
                        nodeCount: this.nodes.length,
                        messageCount: this.messageCount
                    }
                };
                break;
                
            case 'nodes':
                responseData = {
                    command: 'nodes',
                    result: {
                        nodes: this.nodes.map(n => ({
                            nodeId: n.nodeId,
                            nodeName: n.nodeName,
                            isOnline: true,
                            lastSeen: Date.now()
                        }))
                    }
                };
                break;
                
            default:
                responseData = {
                    command: command,
                    error: `Unknown command: ${command}`
                };
        }

        return createBridgeMessage(
            this.stationId,
            message.routing.fromStation,
            0,
            message.routing.fromNode,
            MessageType.COMMAND,
            JSON.stringify(responseData)
        );
    }

    public getStats(): any {
        return {
            stationId: this.stationId,
            nodeCount: this.nodes.length,
            messageCount: this.messageCount,
            nodes: this.nodes
        };
    }
}

// Demo test scenarios
async function runMockStationDemo(): Promise<void> {
    console.log('🎭 Mock Station Demo - EncryptedMeshLink Testing');
    console.log('=' .repeat(60));

    // Create mock station
    const mockStation = new SimpleMockStation('demo-remote-station');
    
    console.log('🏗️  Created mock station:', mockStation.getStats());
    console.log('');

    // Test 1: User message
    console.log('📋 Test 1: User Message');
    const userMessage = createBridgeMessage(
        'local-station',
        'demo-remote-station',
        1234,
        1001,
        MessageType.USER_MESSAGE,
        JSON.stringify({
            text: 'Hello from local station!',
            fromNodeName: 'Local Node'
        })
    );

    const userResponse = await mockStation.handleMessage(userMessage);
    if (userResponse) {
        const responseData = JSON.parse(userResponse.payload.data);
        console.log(`✅ Response: "${responseData.text}"`);
    } else {
        console.log('❌ No response received');
    }
    console.log('');

    // Test 2: Ping command
    console.log('📋 Test 2: Ping Command');
    const pingMessage = createBridgeMessage(
        'local-station',
        'demo-remote-station',
        1234,
        0,
        MessageType.COMMAND,
        JSON.stringify({ command: 'ping' })
    );

    const pingResponse = await mockStation.handleMessage(pingMessage);
    if (pingResponse) {
        const responseData = JSON.parse(pingResponse.payload.data);
        console.log(`✅ Ping result: ${responseData.result}`);
        console.log(`📊 Station info:`, responseData.stationInfo);
    } else {
        console.log('❌ No ping response received');
    }
    console.log('');

    // Test 3: Node discovery
    console.log('📋 Test 3: Node Discovery');
    const nodesMessage = createBridgeMessage(
        'local-station',
        'demo-remote-station',
        1234,
        0,
        MessageType.COMMAND,
        JSON.stringify({ command: 'nodes' })
    );

    const nodesResponse = await mockStation.handleMessage(nodesMessage);
    if (nodesResponse) {
        const responseData = JSON.parse(nodesResponse.payload.data);
        console.log(`✅ Discovered ${responseData.result.nodes.length} nodes:`);
        responseData.result.nodes.forEach((node: any) => {
            console.log(`   - ${node.nodeName} (ID: ${node.nodeId})`);
        });
    } else {
        console.log('❌ No nodes response received');
    }
    console.log('');

    // Test 4: Invalid node
    console.log('📋 Test 4: Invalid Node Error');
    const invalidMessage = createBridgeMessage(
        'local-station',
        'demo-remote-station',
        1234,
        9999, // Non-existent node
        MessageType.USER_MESSAGE,
        JSON.stringify({
            text: 'Message to invalid node',
            fromNodeName: 'Local Node'
        })
    );

    const errorResponse = await mockStation.handleMessage(invalidMessage);
    if (errorResponse && errorResponse.payload.type === MessageType.ERROR) {
        const errorData = JSON.parse(errorResponse.payload.data);
        console.log(`✅ Error handling works: "${errorData.error}"`);
    } else {
        console.log('❌ Error handling failed');
    }
    console.log('');

    // Final stats
    console.log('📊 Final Mock Station Stats:');
    console.log(mockStation.getStats());
    console.log('');
    console.log('🎉 Mock station demo completed successfully!');
    console.log('');
    console.log('🚀 Ready for end-to-end P2P testing with real bridge integration');
}

// Run the demo
runMockStationDemo().catch(console.error);
