'use strict';
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;

    const { introduction, like, dontLike, opinion, forfansof, shouldtheylistenmore, _id, reviewer, song: { streaming_link, artist_name, song_name, press_photo } } = await strapi.services.review.findOne({ id });

    const entity = {
      id: _id,
      review: {
        introduction,
        'what i like':like,
        'what i don\'t like': dontLike,
        'my drunk opinion':opinion,
        'for fans of':forfansof,
        'should you listen to more':shouldtheylistenmore
      },
      streaming_link,
      artist_name,
      song_name,
      press_photo,
      reviewer
    }

    console.log(entity)

    return sanitizeEntity(entity, { model: strapi.models.review });
  },

  async find(ctx) {
    let entity, review;


    if (ctx.query._q) {
      //entities = await strapi.services.restaurant.search(ctx.query);
    } else {
      entity = await strapi.services.review.find({ sent: true, category: 'songreview' });
      console.log(entity);

      review = entity.map(item => {
        const { introduction, like, dontLike, opinion, forfansof, shouldtheylistenmore, id } = item;
        const { streaming_link, artist_name, song_name, press_photo } = item.song;
        return {
          id,
          introduction,
          like,
          dontLike,
          opinion,
          forfansof,
          shouldtheylistenmore,
          streaming_link,
          artist_name,
          song_name,
          press_photo
        }
      })
    }

    return review;
  }
};
