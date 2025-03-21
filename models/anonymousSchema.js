const mongoose = require('mongoose')
const anonymousSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: true },
    token: { type: String, require: true, unique: true }
})

const model = mongoose.model('AnonymousSchema', anonymousSchema)
module.exports = model