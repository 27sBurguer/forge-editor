const sessions = new Map();

function getSession(sessionId) {
	return sessions.get(sessionId) || null;
}

function setSession(sessionId, sessionData) {
	sessions.set(sessionId, sessionData);
	return sessionData;
}

module.exports = {
	getSession,
	setSession,
};
