const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1> Get tour data from collection
  const tours = await Tour.find();

  //2> build tempelates

  //3> render the template using tour data from 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours, //equals tours: tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) return next(new AppError('There is no tour with that name', 404));
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //1> Find all bookings
  const booking = await Booking.find({ user: req.user.id });

  //2> Find tours with the returned IDs
  const TourIds = booking.map((el) => {
    return el.tour;
  });
  // console.log(TourIDs);
  const tours = await Tour.find({ _id: { $in: TourIds } });
  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
