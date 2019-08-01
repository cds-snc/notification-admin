from dotenv import load_dotenv
from flask import Flask
from app import create_app

load_dotenv()

application = Flask('app')

create_app(application)
