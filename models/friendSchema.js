const mongoose = require('mongoose')
const friendSchema = new mongoose.Schema({
    link: { type: String, require: true, unique: true },
    name: { type: String, require: true, unique: false }
})

const model = mongoose.model('friendSchema', friendSchema)
module.exports = model