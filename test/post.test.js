const app = require('../app')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const request = require('supertest')
const Post = require('../app/models/Post')
const User = require('../app/models/User')

const testUserId = new mongoose.Types.ObjectId()
let token = ''
const demoPost = {
  content: 'test post content',
  userId: testUserId,
  votes: {
    upVotes: {
      count: 0,
      users: []
    },
    downVotes: {
      count: 0,
      users: []
    }
  }
}

const updatePost = {
  content: 'updated post content'
}

const upvotePost = {
  content: 'test post content',
  userId: testUserId,
  votes: {
    upVotes: {
      count: 1,
      users: [
        testUserId
      ]
    },
    downVotes: {
      count: 0,
      users: []
    }
  }
}

const downvotePost = {
  content: 'test post content',
  userId: testUserId,
  votes: {
    upVotes: {
      count: 0,
      users: []
    },
    downVotes: {
      count: 1,
      users: [
        testUserId
      ]
    }
  }
}

const testPostId = new mongoose.Types.ObjectId()
const testPost = {
  _id: testPostId,
  ...demoPost
}

const demoUser = {
  name: {
    firstName: 'test',
    lastName: 'test'
  },
  email: 'test3@mailinator.com',
  phone: '1234567890',
  password: 'abc12345',
  info: {
    about: {
      shortDescription: 'this is short description',
      longDescription: 'this is a very long description',
      website: 'https://www.google.com',
      designation: 'software engg',
      skills: [
        'c++',
        'java'
      ],
      education: [{
        school: {
          schoolName: 'firstSchoolName',
          year: '2017-2021'
        }
      },
      {
        school: {
          schoolName: 'secondSchoolName',
          year: '2007-2014'
        }
      }
      ],
      location: 'location'
    }
  }
}

const testUser = {
  _id: testUserId,
  ...demoUser,
  email: 'test@mailinator.com',
  phone: '1234567891',
  tokens: [{
    token: jwt.sign({
      _id: testUserId
    }, process.env.JWT_SECRET)
  }]
}
let server
/**
 * This will pe performed once at the beginning of the test
 */
beforeAll(async (done) => {
  await Post.deleteMany()
  await new User(testUser).save()
  server = app.listen(4000, () => {
    global.agent = request.agent(server)
    done()
  })
  const response = await request(app)
    .post('/auth/login')
    .send({
      email: testUser.email,
      password: testUser.password
    })
  token = response.body.token
  done()
})

/**
 * This deletes all the existing user in database,
 * and creates a new user in database with the provided details.
 */
beforeEach(async () => {
  await Post.deleteMany()
  await new Post(testPost).save()
})

/**
 * Testing post creation
 */
test('Should create new post', async (done) => {
  const response = await request(app)
    .post('/post')
    .set('Authorization', `Bearer ${token}`)
    .send(demoPost)
    .expect(201)

  // Assert that db was changed
  const post = await Post.findById(response.body.post._id)
  expect(post).not.toBeNull()

  const userId = response.body.post.userId

  // Assertions about the response
  expect(response.body).toMatchObject({
    post: {
      content: demoPost.content,
      userId: `${userId}`,
      votes: {
        upVotes: {
          count: demoPost.votes.upVotes.count,
          users: demoPost.votes.upVotes.users
        },
        downVotes: {
          count: demoPost.votes.downVotes.count,
          users: demoPost.votes.downVotes.users
        }
      }
    }
  })
  done()
})

/**
 * Testing post deletion
 */

test('Should delete post', async (done) => {
  await request(app)
    .delete(`/post/${testPostId}`)
    .set('Authorization', `Bearer ${token}`)
    .send()
    .expect(200)

  // Assert that post was deleted
  const post = await Post.findById(testPostId)
  expect(post).toBeNull()
  done()
})

/**
 * Testing GET post
 */

test('Should get post for user', async (done) => {
  await request(app)
    .get(`/post/${testPostId}`)
    .set('Authorization', `Bearer ${token}`)
    .send()
    .expect(200)
  done()
})

/**
 * Testing upvote post
 */

test('Should upvote the post', async (done) => {
  const response = await request(app)
    .put(`/post/upvote/${testPostId}`)
    .set('Authorization', `Bearer ${token}`)
    .send()
    .expect(200)

  const userId = response.body.post.userId

  expect(response.body).toMatchObject({
    post: {
      content: upvotePost.content,
      userId: `${userId}`,
      votes: {
        upVotes: {
          count: upvotePost.votes.upVotes.count,
          users: response.body.post.votes.upVotes.users
        },
        downVotes: {
          count: upvotePost.votes.downVotes.count,
          users: upvotePost.votes.downVotes.users
        }
      }
    }
  })
  done()
})

/**
 * Testing downvote post
 */

test('Should downvote the post', async (done) => {
  const response = await request(app)
    .put(`/post/downvote/${testPostId}`)
    .set('Authorization', `Bearer ${token}`)
    .send()
    .expect(200)

  const userId = response.body.post.userId

  expect(response.body).toMatchObject({
    post: {
      content: downvotePost.content,
      userId: `${userId}`,
      votes: {
        upVotes: {
          count: downvotePost.votes.upVotes.count,
          users: downvotePost.votes.upVotes.users
        },
        downVotes: {
          count: downvotePost.votes.downVotes.count,
          users: response.body.post.votes.downVotes.users
        }
      }
    }
  })
  done()
})

/**
 * Testing post update
 */
test('Should update the Post data', async (done) => {
  await request(app)
    .patch(`/post/${testPostId}`)
    .set('Authorization', `Bearer ${token}`)
    .send(updatePost)
    .expect(204)
  done()
})
/**
 * TODO: FIX ERROR
 * This is a temporary fix to issue:
 * Jest has detected the following 1 open handle potentially keeping Jest from exiting
 */
afterAll(async () => {
  // close server
  await server.close()
  // delete all the posts post testing
  await Post.deleteMany()
  // Closing the DB connection allows Jest to exit successfully.
  await mongoose.connection.close()
})
