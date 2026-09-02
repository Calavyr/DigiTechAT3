const verificationEmailIds = {}

function addVerificationEmailId(id, email, password) {
    verificationEmailIds[id] = { email, password }
}

function deleteVerificationEmailId(id) {
    delete verificationEmailIds[id]
}

module.exports = {
    verificationEmailIds,
    addVerificationEmailId,
    deleteVerificationEmailId
}