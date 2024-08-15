class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    const queryObj = { ...this.queryString }; //these 3 dots will take all the filed outside of the request
    const excludedFields = ['page', 'sort', 'limit', 'field'];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    });
    //1> Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    console.log(JSON.parse(queryStr));
    console.log(queryObj);
    // console.log(this.queryString);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
    // let query = Tour.find(JSON.parse(queryStr));
  }
  sorting() {
    if (this.queryString.sort) {
      let sortBy = this.queryString.sort.split(',').join(' ');
      console.log(sortBy);
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }
  limitFields() {
    if (this.queryString.field) {
      let field = this.queryString.field.split(',').join(' ');
      this.query = this.query.select(field);
      console.log(field);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }
  pagination() {
    const page = this.queryString.page * 1 || 1;
    console.log(page);
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
