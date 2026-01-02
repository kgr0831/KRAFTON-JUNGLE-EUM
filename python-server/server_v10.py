import sys
import os
from concurrent import futures

import grpc

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import Config
from utils.logger import DebugLogger
from models.manager import ModelManager
from services.conversation import ConversationServicer
from generated import conversation_pb2_grpc


def serve():
    """Start the gRPC server"""
    print("\n" + "=" * 70)
    print("Python AI Server v10 - Modular Architecture")
    print("=" * 70)
    print(f"STT Backend: {Config.STT_BACKEND}")
    if Config.STT_BACKEND == "whisper":
        print(f"Whisper Model: {Config.WHISPER_MODEL_SIZE}")
    else:
        print(f"AWS Region: {Config.AWS_REGION}")
    print(f"Translation Backend: {Config.TRANSLATION_BACKEND}")
    print(f"Debug Logging: {'ENABLED' if DebugLogger.ENABLED else 'DISABLED'}")
    print("=" * 70 + "\n")

    # Load AI models
    model_manager = ModelManager()
    model_manager.initialize()

    # Create gRPC server
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=Config.MAX_WORKERS),
        options=[
            ('grpc.max_receive_message_length', 50 * 1024 * 1024),
            ('grpc.max_send_message_length', 50 * 1024 * 1024),
        ]
    )

    # Register services
    conversation_pb2_grpc.add_ConversationServiceServicer_to_server(
        ConversationServicer(model_manager), server
    )

    server.add_insecure_port(f'[::]:{Config.GRPC_PORT}')
    server.start()

    # Display startup info
    stt_display = model_manager.get_stt_display()

    print(f"\n🚀 gRPC Server started on port {Config.GRPC_PORT}")
    print(f"📡 STT: {stt_display}")
    print(f"🌐 Translation: {Config.TRANSLATION_BACKEND}")
    print("Press Ctrl+C to stop\n")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        server.stop(5)


if __name__ == "__main__":
    serve()
