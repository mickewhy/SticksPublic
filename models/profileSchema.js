const mongoose = require('mongoose')
const profileSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: true },
    acorns: { type: Number, default: 0 }
})

const model = mongoose.model('ProfileSchema', profileSchema)
module.exports = model