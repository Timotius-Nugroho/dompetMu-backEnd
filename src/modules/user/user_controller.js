const helper = require('../../helpers')
const bcrypt = require('bcrypt')
const userModel = require('./user_model')

module.exports = {
  getUserById: async (req, res) => {
    try {
      // console.log(req.params)
      const { id } = req.params
      const result = await userModel.getDataById(id)
      delete result[0].user_password
      delete result[0].user_pin
      return helper.response(res, 200, 'Succes get by ID !', result)
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  },

  getAllUser: async (req, res) => {
    try {
      // console.log(req.query)
      let { page, limit, sort, keywords } = req.query

      limit = limit || '6'
      page = page || '1'
      keywords = '%' + keywords + '%' || '%%'
      sort = sort || 'user_name ASC'

      page = parseInt(page)
      limit = parseInt(limit)
      const offset = page * limit - limit

      const totalData = await userModel.getDataCount(keywords)
      const totalPage = Math.ceil(totalData / limit)
      const pageInfo = {
        page,
        totalPage,
        limit,
        totalData
      }

      const result = await userModel.getDataAll(limit, offset, keywords, sort)
      for (const user of result) {
        delete user.user_password
        delete user.user_pin
      }
      return helper.response(
        res,
        200,
        'Succes Get Data By Name',
        result,
        pageInfo
      )
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  },

  updateProfile: async (req, res) => {
    try {
      // console.log(req.body)
      const id = req.decodeToken.user_id
      const checkUser = await userModel.getDataById(id)

      if (checkUser.length === 0) {
        return helper.response(
          res,
          404,
          `cannot update, data by id ${id} not found !`,
          null
        )
      }

      const setData = {}
      for (const [key, value] of Object.entries(req.body)) {
        setData[helper.convertToSnakeCase(key)] = value
      }
      setData.user_image = req.file
        ? req.file.filename
        : checkUser[0].user_image
      setData.user_updated_at = new Date(Date.now())
      // console.log(setData)

      if (req.file) {
        if (checkUser[0].user_image.length > 0) {
          console.log(`Delete Image${checkUser[0].user_image}`)
          const imgLoc = `src/uploads/${checkUser[0].user_image}`
          helper.deleteImage(imgLoc)
        } else {
          console.log('NO img in Uploads folder')
        }
      }

      const result = await userModel.updateData(setData, id)
      return helper.response(res, 200, 'Succes update data !', result)
    } catch (error) {
      // console.log(error)
      return helper.response(res, 400, 'Bad Request', error)
    }
  },

  userDeleteProfile: async (req, res) => {
    try {
      const id = req.decodeToken.user_id
      const checkUser = await userModel.getDataById(id)

      if (checkUser.length === 0) {
        return helper.response(
          res,
          404,
          `cannot delete profile, data by id ${id} not found !`,
          null
        )
      }

      if (checkUser[0].user_image.length > 0) {
        console.log(`Delete Image${checkUser[0].user_image}`)
        const imgLoc = `src/uploads/${checkUser[0].user_image}`
        helper.deleteImage(imgLoc)
      } else {
        return helper.response(
          res,
          404,
          'cannot delete profile, user has no image !',
          null
        )
      }

      const result = await userModel.updateData({ user_image: '' }, id)
      return helper.response(res, 200, 'Succes delete photo profile !', result)
    } catch (error) {
      // console.log(error)
      return helper.response(res, 400, 'Bad Request', error)
    }
  },

  updatePin: async (req, res) => {
    try {
      const userId = req.decodeToken.user_id
      let newPin = req.body.newPin
      const check = /^[0-9]+$/.test(newPin)

      if (newPin.length !== 6 || check === false) {
        return helper.response(res, 411, 'Pin is not eligible')
      }
      const salt = bcrypt.genSaltSync(10)
      newPin = bcrypt.hashSync(newPin, salt)

      await userModel.updateData({ user_pin: newPin }, userId)
      return helper.response(res, 200, 'Succes set pin')
    } catch (error) {
      console.log(error)
      return helper.response(res, 400, 'Bad Request', error)
    }
  },

  updatePassword: async (req, res) => {
    try {
      const userId = req.decodeToken.user_id
      let { currentPassword, newPassword } = req.body

      const checkUser = await userModel.getDataById(userId)
      if (checkUser[0].length === 0) {
        return helper.response(res, 404, 'User not found !')
      }

      const checkPassword = bcrypt.compareSync(
        currentPassword,
        checkUser[0].user_password
      )
      if (checkPassword) {
        const salt = bcrypt.genSaltSync(10)
        newPassword = bcrypt.hashSync(newPassword, salt)
        await userModel.updateData({ user_password: newPassword }, userId)
        return helper.response(res, 200, 'Succes change password !')
      } else {
        return helper.response(res, 400, 'Wrong current password !')
      }
    } catch (error) {
      console.log(error)
      return helper.response(res, 400, 'Bad Request', error)
    }
  }
}
