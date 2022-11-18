package app

import (
	"encoding/json"
	"github.com/leighmacdonald/gbans/internal/config"
	"github.com/leighmacdonald/gbans/pkg/fp"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"golang.org/x/exp/slices"
	"sync"
)

type pugLobby struct {
	*sync.RWMutex
	Leader   *wsClient                `json:"leader"`
	LobbyId  string                   `json:"lobbyId"`
	Clients  wsClients                `json:"clients"`
	Messages []pugUserMessageResponse `json:"messages"`
	Options  createLobbyOpts          `json:"options"`
}

func (lobby *pugLobby) lobbyType() LobbyType {
	return lobbyTypePug
}

func newPugLobby(creator *wsClient, id string, opts createLobbyOpts) (*pugLobby, error) {
	lobby := &pugLobby{
		Leader:   creator,
		RWMutex:  &sync.RWMutex{},
		LobbyId:  id,
		Clients:  wsClients{creator},
		Messages: []pugUserMessageResponse{},
		Options:  opts,
	}
	creator.lobbies = append(creator.lobbies, lobby)
	return lobby, nil
}

func (lobby *pugLobby) clientCount() int {
	lobby.RLock()
	defer lobby.RUnlock()
	return len(lobby.Clients)
}

func (lobby *pugLobby) id() string {
	lobby.RLock()
	defer lobby.RUnlock()
	return lobby.LobbyId
}

func (lobby *pugLobby) join(client *wsClient) error {
	lobby.Lock()
	defer lobby.Unlock()
	if slices.Contains(lobby.Clients, client) {
		return ErrDuplicateClient
	}
	lobby.Clients = append(lobby.Clients, client)
	client.lobbies = append(client.lobbies, lobby)
	log.WithFields(log.Fields{
		"clients": len(lobby.Clients),
		"leader":  len(lobby.Clients) == 1,
		"lobby":   lobby.LobbyId,
	}).Infof("User joined lobby")
	if len(lobby.Clients) == 1 {
		return lobby.promote(client)
	}
	client.send(
		wsMsgTypePugJoinLobbyResponse,
		true,
		wsJoinLobbyResponse{Lobby: lobby},
	)
	return nil
}

func (lobby *pugLobby) promote(client *wsClient) error {
	lobby.Lock()
	defer lobby.Unlock()
	lobby.Leader = client
	return nil
}

func (lobby *pugLobby) leave(client *wsClient) error {
	lobby.RLock()
	if !slices.Contains(lobby.Clients, client) {
		lobby.RUnlock()
		return ErrUnknownClient
	}
	lobby.RUnlock()
	lobby.broadcast(wsMsgTypePugLeaveLobbyResponse, true, struct {
		LobbyId string `json:"lobby_id"`
		SteamId string `json:"steam_id"`
	}{
		LobbyId: lobby.id(),
		SteamId: client.User.SteamID.String(),
	},
	)
	lobby.Clients = fp.Remove(lobby.Clients, client)
	client.removeLobby(lobby)
	return nil
}

func (lobby *pugLobby) broadcast(msgType wsMsgType, status bool, payload any) {
	lobby.Clients.broadcast(msgType, status, payload)
}

func (lobby *pugLobby) sendUserMessage(client *wsClient, msg lobbyUserMessageRequest) {
	lobby.Lock()
	defer lobby.Unlock()
	userMessage := pugUserMessageResponse{
		User:      client.User,
		Message:   msg.Message,
		CreatedAt: config.Now(),
	}
	lobby.Messages = append(lobby.Messages, userMessage)
	lobby.broadcast(wsMsgTypePugUserMessageResponse, true, userMessage)
}

func leavePugLobby(cm *wsConnectionManager, client *wsClient, payload json.RawMessage) error {
	var req createLobbyOpts
	if errUnmarshal := json.Unmarshal(payload, &req); errUnmarshal != nil {
		log.WithError(errUnmarshal).Error("Failed to unmarshal create request")
		return errUnmarshal
	}
	lobby, found := client.currentPugLobby()
	if !found {
		return ErrInvalidLobbyId
	}
	if errLeave := lobby.leave(client); errLeave != nil {
		return errLeave
	}
	if lobby.clientCount() == 0 {
		if errRemove := cm.removeLobby(lobby.LobbyId); errRemove != nil {
			log.WithError(errRemove).Error("Failed to remove empty lobby")
			return nil
		}
	}
	return nil
}
func joinPugLobby(cm *wsConnectionManager, client *wsClient, payload json.RawMessage) error {
	var req wsJoinLobbyRequest
	if errUnmarshal := json.Unmarshal(payload, &req); errUnmarshal != nil {
		log.WithError(errUnmarshal).Error("Failed to unmarshal create request")
		return errUnmarshal
	}
	lobby, findErr := cm.findLobby(req.LobbyId)
	if findErr != nil {
		return findErr
	}
	if errJoin := lobby.join(client); errJoin != nil {
		return errJoin
	}
	return nil
}

func createPugLobby(cm *wsConnectionManager, client *wsClient, payload json.RawMessage) error {
	var req createLobbyOpts
	if errUnmarshal := json.Unmarshal(payload, &req); errUnmarshal != nil {
		log.WithError(errUnmarshal).Error("Failed to unmarshal create request")
		return errUnmarshal
	}
	lobby, errCreate := cm.createPugLobby(client, req)
	if errCreate != nil {
		return errCreate
	}
	sendPugCreateLobbyResponse(client, lobby)
	return nil
}

func sendPugUserMessage(_ *wsConnectionManager, client *wsClient, payload json.RawMessage) error {
	var req lobbyUserMessageRequest
	if errUnmarshal := json.Unmarshal(payload, &req); errUnmarshal != nil {
		log.WithError(errUnmarshal).Error("Failed to unmarshal user message request")
		return errors.New("Invalid request")
	}
	lobby, found := client.currentPugLobby()
	if !found {
		return ErrInvalidLobbyId
	}
	lobby.sendUserMessage(client, req)
	return nil
}

func sendPugLobbyListStates(cm *wsConnectionManager, client *wsClient, _ json.RawMessage) {
	client.send(wsMsgTypePugLobbyListStatesResponse, true, wsPugLobbyListStatesResponse{Lobbies: cm.pubLobbyList()})
}

func sendPugCreateLobbyResponse(client *wsClient, lobby *pugLobby) {
	client.send(
		wsMsgTypePugCreateLobbyResponse,
		true,
		wsJoinLobbyResponse{Lobby: lobby},
	)
}
