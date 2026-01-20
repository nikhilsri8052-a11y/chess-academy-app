"""
Flask Application Factory
"""
from flask import Flask
from app.config import Config


def create_app(config_class=Config):
    """Create and configure the Flask application"""
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.from_object(config_class)
    
    # Register blueprints
    from app.routes.main import bp as main_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.admin import bp as admin_bp
    from app.routes.student import bp as student_bp
    from app.api.chat import chat_bp
    
    app.register_blueprint(chat_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(student_bp)
    
    # Context processor for user role
    from app.utils.helpers import inject_user_role
    app.context_processor(inject_user_role)
    
    return app
