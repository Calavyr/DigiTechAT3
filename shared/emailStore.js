const verificationEmailIds = {}

function addVerificationEmailId(id, email, username, password) {
    verificationEmailIds[id] = { email, username, password }
}

function deleteVerificationEmailId(id) {
    delete verificationEmailIds[id]
}

module.exports = {
    verificationEmailIds,
    addVerificationEmailId,
    deleteVerificationEmailId
}