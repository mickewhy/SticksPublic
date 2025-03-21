const mongoose = require('mongoose')
const bannerSchema = new mongoose.Schema({
    link: { type: String, require: true, unique: true }
})

const model = mongoose.model('BannerSchema', bannerSchema)
module.exports = model