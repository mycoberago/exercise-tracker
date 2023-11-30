const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
let mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())
app.use(express.static('public'))

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const usersSchema = new mongoose.Schema({
  username: {
    type: String
  }
})

const exerciseSchema = new mongoose.Schema({
  date: {
    type: Date
  },
  duration: {
    type: Number
  },
  description: {
    type: String
  },
  id: {
    type: ObjectId
  }
})

let User = mongoose.model('User', usersSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

//  CREATE USER
app.post('/api/users', async (req, res) => {
  let { username } = req.body;
  if (!username) {
    return res.json({ error: 'no username' })
  }
  let user = new User({ username: username });

  await user.save();

  res.json({
    username: username,
    _id: user._id
  })

})

app.post('/api/users/:_id/exercises', async (req, res) => {
  console.log(req.params);
  let _id = req.params._id;
  let description = req.body.description;
  let duration = parseInt(req.body.duration);
  let date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();

  try {
    let user = await User.findById(_id);

    if (user) {

      let doc = {
        id: _id,
        description: description,
        duration: duration,
        date: date
      }

      let exercise = new Exercise(doc);

      await exercise.save();

      return res.json({
        _id: user._id,
        username: user.username,
        date: date,
        duration: duration,
        description: description
      });

    } //  IF THERE IS A USER;

    return res.json({ error: 'Unable to find user' })

  } catch (error) {
    return res.json({ error: error.message })
  }

})

// create user
app.get('/api/users', async (req, res) => {
  let users = await User.find();
  res.json(users);
})

//  GET LOGS
app.get('/api/users/:_id/logs', async (req, res) => {
  let { _id } = req.params;
  let { query } = req;
  console.log(query);
  let from, to;
  let limit = 0;

  //  If there are query parameters
  if (Object.keys(query).length > 0) {
    from = query?.from;
    to = query?.to;
    limit = query?.limit ? parseInt(query?.limit) : 0;
  }

  if (from && to && limit > 0) {

    try {
      let data = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(_id) } },
        {
          $lookup: {
            from: 'exercises',
            localField: '_id',
            foreignField: 'id',
            as: 'log',
            pipeline: [
              {
                $match: {
                  date: {
                    $gt: new Date(from),
                    $lt: new Date(to)
                  }
                }
              },
              { $limit: limit }
            ]
          }
        }
      ])

      if (data.length > 0) {
        let result = data[0];
        result['count'] = result.log.length;
        for(var i of result['log']) {
          i['date'] = new Date(i['date']).toDateString();
        }
        console.log(result);
        return res.json(result);
      } //  IF DATA
      return res.json({ error: 'Unable to find user' });
      
    } catch (error) {
      res.json({ error: error.message })
    }


  } //  LIMIT and RANGE

//  If there is no limit
if (from && to) {

  try {
    let data = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(_id) } },
      {
        $lookup: {
          from: 'exercises',
          localField: '_id',
          foreignField: 'id',
          as: 'log',
          pipeline: [
            {
              $match: {
                date: {
                  $gt: new Date(from),
                  $lt: new Date(to)
                }
              }
            }
          ]
        }
      }
    ])

    if (data.length > 0) {
      let result = data[0];
      result['count'] = result.log.length;
      for(var i of result['log']) {
        i['date'] = new Date(i['date']).toDateString();
      }
      console.log(result);
      return res.json(result);
    }
    return res.send("No data found");
  } catch (error) {
    return res.json({ error: error.message })
  }

}  // NO LIMIT BUT THERE IS RANGE

if (limit > 0) {

  try {

    let data = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(_id) } },
      {
        $lookup: {
          from: 'exercises',
          localField: '_id',
          foreignField: 'id',
          as: 'log',
          pipeline: [
            { $limit: limit }
          ]
        }
      }
    ])

    if (data.length > 0) {
      let result = data[0];
      result['count'] = result.log.length;
      for(var i of result['log']) {
        i['date'] = new Date(i['date']).toDateString();
      }
      console.log(result);
      return res.json(result);
    }

    return res.send("No data found");

  } catch (error) {

    return res.json({ error: error.message })

  }

} //  LIMIT ONLY

try {
  const defaultSearch = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(_id) } },
    {
      $lookup: {
        from: 'exercises',
        localField: '_id',
        foreignField: 'id',
        as: 'log'
      }
    }
  ])

  if (defaultSearch.length > 0) {
    let result = defaultSearch[0];
    result['count'] = result.log.length;
    for(var i of result['log']) {
      i['date'] = new Date(i['date']).toDateString();
    }
    console.log(result);
    return res.json(result);
  }

  return res.send("No data found");

} catch (error) {
  return res.json({ error: error.message })
}
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
