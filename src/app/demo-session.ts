// Local prototype navigation state; this is not server authentication.
const sessionKey = 'creator-center-demo-session'

export function hasDemoSession() {
  return sessionStorage.getItem(sessionKey) === 'signed-in'
}

export function logout() {
  sessionStorage.removeItem(sessionKey)
  window.location.replace('/login/index.html')
}
