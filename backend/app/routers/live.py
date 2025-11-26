"""
WebSocket router for Gemini Live API proxy
Handles real-time audio streaming between frontend and Google Gemini
"""
import json
import logging
import os
from typing import Dict

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["live"])

# Get Gemini API Key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. Live chat will not work.")


@router.websocket("/live")
async def websocket_live(websocket: WebSocket):
    """
    WebSocket endpoint for Gemini Live API proxy
    
    Flow:
    1. Client connects to this endpoint
    2. This server connects to Google Gemini WebSocket
    3. Proxy messages bidirectionally between client and Gemini
    """
    await websocket.accept()
    logger.info("✅ Client connected to /v1/live")
    
    gemini_ws = None
    
    try:
        if not GEMINI_API_KEY:
            await websocket.send_json({
                "error": "GEMINI_API_KEY not configured on server"
            })
            await websocket.close()
            return
        
        # Connect to Google Gemini WebSocket
        gemini_url = (
            f"wss://generativelanguage.googleapis.com/ws/"
            f"google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={GEMINI_API_KEY}"
        )
        
        logger.info("🔗 Connecting to Google Gemini...")
        gemini_ws = await websockets.connect(gemini_url)
        logger.info("✅ Connected to Google Gemini")
        
        # Send initial setup message
        setup_message = {
            "setup": {
                "model": "models/gemini-2.5-flash-live",
                "generation_config": {
                    "response_modalities": ["AUDIO"]
                }
            }
        }
        await gemini_ws.send(json.dumps(setup_message))
        logger.info("✅ Sent setup config to Gemini")
        
        # Forward setup confirmation to client
        setup_response = await gemini_ws.recv()
        await websocket.send_text(setup_response)
        
        # Bidirectional message forwarding
        async def forward_to_gemini():
            """Forward messages from client to Gemini"""
            try:
                while True:
                    data = await websocket.receive_text()
                    if gemini_ws:
                        await gemini_ws.send(data)
            except WebSocketDisconnect:
                logger.info("Client disconnected")
            except Exception as e:
                logger.error(f"Error forwarding to Gemini: {e}")
        
        async def forward_to_client():
            """Forward messages from Gemini to client"""
            try:
                while True:
                    if gemini_ws:
                        data = await gemini_ws.recv()
                        await websocket.send_text(data)
            except websockets.exceptions.ConnectionClosed:
                logger.info("Gemini connection closed")
            except Exception as e:
                logger.error(f"Error forwarding to client: {e}")
        
        # Run both forwarding tasks concurrently
        import asyncio
        await asyncio.gather(
            forward_to_gemini(),
            forward_to_client(),
            return_exceptions=True
        )
        
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "error": f"Server error: {str(e)}"
            })
        except:
            pass
    finally:
        # Cleanup
        if gemini_ws:
            try:
                await gemini_ws.close()
            except:
                pass
        try:
            await websocket.close()
        except:
            pass
        logger.info("🔌 WebSocket connection closed")

