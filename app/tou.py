from flask import request, session
from flask_login import current_user
from app.articles.routing import GC_ARTICLES_ROUTES

def show_tou_dialog():
    """Determine whether or not the TOU dialog should be shown.

        The TOU dialog should be displayed if the user is authenticated, has not already agreed to the terms, and is not on the contact page or a GCA route.    
    """

    is_gca_route = False

    for route in GC_ARTICLES_ROUTES.values():
        if request.path == route['en'] or request.path == route['fr']:
            is_gca_route = True
            break
    
    if current_user.is_authenticated and not session.get('terms_agreed') and '/contact' not in request.url and not is_gca_route:
        return True

    return False
