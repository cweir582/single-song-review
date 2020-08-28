const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.subscriber.create(data, { files });
    } else {

      try {
        const { ref, email } = JSON.parse(ctx.request.body);

      console.log(JSON.parse(ctx.request.body));

      const artist = await strapi.query('artist').findOne({ referral: ref });

      await strapi.query('artist').update(
        { id: artist.id },
        {
          referred: artist.referred + 1
        }
      );

      entity = await strapi.services.subscriber.create(ctx.request.body);
      } catch (error) {
        console.log("Oh no!");
      }
    }
    return sanitizeEntity(entity, { model: strapi.models.subscriber });
  },
};
