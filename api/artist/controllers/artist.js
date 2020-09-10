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

  async confirm(ctx) {
    try {
      const { token } = ctx.params;

      console.log(token);

        await strapi.query("artist").update(
          { confirmationToken: token },
          {
            confirm: true,
          }
        );

        const artist = await strapi.query("artist").findOne({ confirmationToken: token });

       // console.log(artist);

        if(!artist.confirm) throw Error('Not confirmed');

      const entity = artist;
      return sanitizeEntity(entity, { model: strapi.models.artist });
    } catch (error) {
      console.log(error);
      return {message: "error"}
    }
  },

  async sendReferralMail(ctx) {
    const data = JSON.parse(ctx.request.body);

    try {
      console.log(data);
      await strapi.plugins['email'].services.email.send({
        to: data.to,
        from: 'hi@asinglesongreview.com',
        replyTo: 'hi@asinglesongreview.com',
        subject: `From ${data.from}, subscribe to a single song review`,
        html: data.message
      });

      return { data }
    } catch (error) {
      console.log(error);
      console.log("Oh no!");
    }
  }
};
