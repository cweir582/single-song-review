"use strict";
const crypto = require("crypto");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");

//

module.exports = {
  async create(ctx) {
    console.log("Here");
    console.log(ctx.request.body);
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      console.log(data);
      const artist = await strapi
        .query("artist")
        .findOne({ artist: data.artist_name });



      if (!artist) {
        const token = crypto.randomBytes(64).toString('hex');

        let artistData = {
          artist: data.artist_name,
          referral:
            data.artist_name.slice(0, 3) +
            crypto.randomBytes(6).toString("hex"),
          referred: 0,
          confirmationToken: token,
          confirm: false
        };

        await strapi.plugins['email'].services.email.send({
          to: data.contact_email,
          from: 'hi@asinglesongreview.com',
          replyTo: 'hi@asinglesongreview.com',
          subject: 'Confirm you email',
          text: 'Please confirm your email using this link ' + process.env.FRONTEND_URL + '/submit-song/confirmation?token=' + token,
        });

        const artistDoc = await strapi.services.artist.create(artistData);
        data.artistId = artistDoc;
      } else {
        data.artistId = artist;
      }

      entity = await strapi.services.song.create(data, { files });
    } else {
      entity = await strapi.services.song.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.song });
  },

  async random() {
    const artists = await strapi.query('artist').find();
    const songs = await strapi.query('song').find()

     // console.log(artists);

    const getRandomInt = (max) => {
      return Math.floor(Math.random() * Math.floor(max));
    }


    let song = {};

    const rand = getRandomInt(100);

    async function getRandomsong(arr) {
      const randSong = getRandomInt(arr.length-1);

      //if(songs[randSong].picked) getRandomsong(arr);


      song = songs[randSong];

      // await strapi.query("song").update(
      //   { id: song.id },
      //   {
      //     picked: true,
      //   }
      // );

    }

    if(rand >= 85) {
      getRandomsong(songs);
    }else {
      let maxReferred = 0;

      artists.forEach(artist => {
        maxReferred  += artist.referred;
      });

      const rand = getRandomInt(100);

      let counted = 0;

      artists.forEach((artist, idx) => {
        const perc = (artist.referred/maxReferred) * 100;

        if(rand >= counted && rand <= counted + perc) {
          getRandomsong(artist.songs);
        }

        counted += perc;
      })
    }



    return sanitizeEntity(song || getRandomsong(songs), { model: strapi.models.song });
  }

};
