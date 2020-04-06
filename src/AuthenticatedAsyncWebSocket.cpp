#include "AuthenticatedAsyncWebSocket.h"

AuthenticatedAsyncWebSocket::AuthenticatedAsyncWebSocket(auth_t auth, const String &url): AsyncWebSocket(url) {
    _auth = auth;
}

void AuthenticatedAsyncWebSocket::handleRequest(AsyncWebServerRequest *request) {
    if (!_auth(request)) {
        return;
    }
    AsyncWebSocket::handleRequest(request);
}



