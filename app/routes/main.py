"""
Main Routes - Basic Pages
"""
from flask import Blueprint, render_template, send_from_directory
import os

bp = Blueprint('main', __name__)


@bp.route("/")
def home():
    return render_template("home.html")


@bp.route("/about")
def about():
    return render_template("about.html")


@bp.route("/learn")
def learn():
    return render_template("learn.html")


@bp.route("/home-batches")
def home_batches():
    return render_template("home_batches.html")


@bp.route("/assets/<path:filename>")
def assets(filename):
    from flask import current_app
    return send_from_directory(os.path.join(current_app.root_path, "..", "static", "assets"), filename)
