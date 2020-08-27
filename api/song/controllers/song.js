"use strict";
const crypto = require("crypto");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");

//

module.exports = {
  async create(ctx) {
    console.log("Here");
    // console.log(ctx.request.body);
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);

      const artist = await strapi
        .query("artist")
        .findOne({ artist: data.artist_name });

      if (!artist) {
        let artistData = {
          artist: data.artist_name,
          referral:
            data.artist_name.slice(0, 3) +
            crypto.randomBytes(6).toString("hex"),
          referred: 0,
        };

        const artistDoc = await strapi.services.artist.create(artistData);
        data.artistId = artistDoc;
      } else {
        data.artistId = artist;
      }

      await strapi.plugins['email'].services.email.send({
        to: data.contact_email,
        from: 'hi@asinglesongreview.com',
        replyTo: 'annesophiepic@strapi.io',
        subject: 'Use strapi email provider successfully',
        text: 'Hello ' + data.artist_name,
      });

      entity = await strapi.services.song.create(data, { files });
    } else {
      entity = await strapi.services.song.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.song });
  },
};
