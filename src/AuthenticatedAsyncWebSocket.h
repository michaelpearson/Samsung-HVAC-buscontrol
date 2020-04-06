#ifndef GARAGE_DOOR_OPENER_AUTHENTICATEDASYNCWEBSOCKET_H
#define GARAGE_DOOR_OPENER_AUTHENTICATEDASYNCWEBSOCKET_H

#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>

typedef bool (*auth_t)(AsyncWebServerRequest*);

class AuthenticatedAsyncWebSocket : public AsyncWebSocket {
public:
    AuthenticatedAsyncWebSocket(auth_t auth, const String &url);
    // AsyncWebSocket.h was modified to allow this function to be overridden
    virtual void handleRequest(AsyncWebServerRequest *request);
private:
    auth_t _auth;
};


#endif
