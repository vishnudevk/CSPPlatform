'use strict';

var _ = require('lodash');
var q = require('q');
var Post = require('./post.model.js');
var Provider = require('../provider.model.js');

// Get list of posts
exports.index = function(req, res) {
  Provider.findById(req.originalUrl.split('/')[3]).select('posts').populate('posts').exec( function(err, provider) {
    if(err) { return handleError(res, err); }
    if(!provider) { return res.status(404).send('Provider not found'); }

    var promises = [];

    _.forEach(provider.posts, function(postId) {
      promises.push(Post.findById(postId).exec());
    });

    q.allSettled(promises)
      .catch(_.partial(handleError, res))
      .then(function(results) {
        console.log(_.map(results, _.property('value')));
        return res.status(200).json(_.map(results, _.property('value')));

      })
  });
};

// Get a single post
exports.show = function(req, res) {
  Post.findById(req.params.id, function (err, post) {
    if(err) { return handleError(res, err); }
    if(!post) { return res.send(404); }
    return res.json(post);
  }).populate('posts');
};

// Creates a new post in the DB.
exports.create = function(req, res) {
  Provider.findById(req.originalUrl.split('/')[3], function(err, provider) {
    if(err) { return handleError(res, err); }
    if(!provider) { return res.status(404).send('Provider not found'); }

     if(req.user===undefined){//if user is not signed in  go to login page
      return res.status(401).end();
    }

    req.body.author = req.user.name;

    console.log('req.body.role',req.body.role)


    Post.create(req.body, function(err, post) {
      if(err) { return handleError(res, err); }

      provider.posts.push(post._id);
      provider.save(function(err) {
        if(err) return handleError(res, err);
        console.log('what save in database',res.body)
        return res.status(201).json(post);
      });
    });
  });
};


// Updates an existing post in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Post.findById(req.params.id, function (err, post) {
    if (err) { return handleError(res, err); }
    if(!post) { return res.send(404); }

    if((req.user===undefined)||(post.author != req.user.name && req.user.role !== "admin")) {

      return res.status(401).end();
    }

    var updated = _.merge(post, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, post);
    });
  });
};

// Deletes a post from the DB.
exports.destroy = function(req, res) {
  Provider.findById(req.originalUrl.split('/')[3], function(err, provider) {
    console.log('providerId', JSON.stringify(req.url));
    console.log('provider', JSON.stringify(provider));
    if (err) {
      return handleError(res, err);
    }
    if (!provider) {
      return res.status(404).send('Comment not found');
    }
    console.log("req.params.id",req.params.id);

    Post.findById(req.params.id, function (err, post) {
      console.log('postId', JSON.stringify(req.url));
      console.log('post', JSON.stringify(post));
      if (err) {
        return handleError(res, err);
      }
      if (!post) {
        return res.send(404).end('Post not found');
      }
      console.log('req.user',req.user);
      console.log('post.author',post.author);

      if((req.user===undefined)||(post.author != req.user.name && req.user.role !== "admin")) {

        return res.status(401).end();
      }
      post.remove(function (err) {
        if (err) {
          return handleError(res, err);
        }
        // Remove the post ID from provider.posts
        provider.replies = _.filter(provider.replies, function (x) {
          return x != req.params.id
        });

        provider.posts.splice(provider.posts.indexOf(req.params.id),1);

        provider.save(function (err, saved) {
          if (err) return handleError(res, err);
          return res.status(204).end();
        })
      });
    });
  });
};

// upvote a post from the DB.
exports.upvote = function(req, res) {
  Post.findById(req.params.id, function(err, post) {
    if(err) return handleError(res, err);
    if(!post) return res.status(404).end('Post not found');

    if(req.user===undefined){//if user is not signed in  go to login page
      return res.status(401).end();
    }
    if(post.author === req.user.name){
      res.write("Novote");//user cannot upvote his post
      return res.status(200).end();
    }
    if(post.upvoteUser.indexOf(req.user.name)<0){//list of user that already upvoted.
      post.upvotes++;
      post.upvoteUser.push(req.user.name);

      post.save(function (err) {
        if (err) return handleError(res, err);

        console.log('res from api UPVOTING REPLY',res.body); //response is null

        res.write("Upvote");
        return res.status(200).end();
      })
    }else{
      post.upvotes--;
      post.upvoteUser.pop(req.user.name);

      post.save(function (err) {
        if (err) return handleError(res, err);
        console.log('res from api UPVOTING REPLY',res.body); //response is null
        res.write("Downvote");
        return res.status(200).end();
      })
    }
  });
};


function handleError(res, err) {
  return res.send(500, err);
}
