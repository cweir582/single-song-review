'use strict';
const crypto = require('crypto');
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  async create(ctx) {
    console.log("Here")
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      console.log("there", data)
      entity = await strapi.services.artist.create(data, { files });
    } else {
      console.log(ctx.request.body)
      const artists = ctx.request.body.artist;
      ctx.request.body.referral = artists.slice(0, 3) + crypto.randomBytes(6).toString('hex');
      entity = await strapi.services.artist.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.artist });
  },
};
