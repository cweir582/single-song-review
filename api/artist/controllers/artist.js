'use strict';
const crypto = require('crypto');
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  async referral(ctx) {
    const { token } = ctx.params;

    console.log(token);

    const entity = await strapi.services.artist.findOne({ referral: token	});
    return sanitizeEntity(entity, { model: strapi.models.artist });
  },
};
