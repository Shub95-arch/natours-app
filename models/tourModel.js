const mongoose = require('mongoose');
const { type } = require('superagent/lib/utils');
const User = require('./userModel');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour Name is required'],
      unique: true,
      maxlength: [40, 'Length exceeded the required length'],
      minlength: [10, 'Length less than the required length'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, ' A tour must have a difficluty'],
      enum: {
        values: ['easy', 'medium', 'difficult'], //This is how we put the error when we have to specify something like this validator
        message: 'Difficulty  should be either easy medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be 1 or above 1'],
      max: [5, 'Rating must be less than 5'],
      set: (val) => {
        Math.round(val * 10) / 10; // If its 4.6 it will be 4.7 not 5
      },
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: Number,
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    //-----------------------------DATA MODELLING
    startLocation: {
      //Geo JSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        }, // THE ARRAY HERE IS USED TO EMBEDD THE DOCUMENTS
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array,   // Embedded way of making it
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }, //Schema Definitions
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // this is a 2d spehere index for the earth radius for geo data in our tour controller

tourSchema.virtual('durationOnWeeks').get(function () {
  //Schema Options- Virtual Properties
  return this.duration / 7;
});
// Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // Means the field name that we have specified in the model
  localField: '_id', // And what is that we specified in the foreign field, in this case its id
});

tourSchema.pre('save', function (next) {
  //Document Middleware: runs only before .save() and .create()
  this.slug = slugify(this.name, { lower: true });

  console.log(this);
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => {
//     return await User.findById(id);                        //EMBEDDED MODEL
//   });
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//Query Middleware

// tourSchema.pre('find', function (next) { -- This will work only for the Find Keyword in mongoose in tour controller
tourSchema.pre(/^find/, function (next) {
  //Now this will work for all the keywords starting with "find"
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides', // this to populate or fill the users
    select: '-__v -passwordChangedAT',
    // this to exclude from the query
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query Took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

//Aggregation MiddleWare

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.log(this.pipeline());

//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
