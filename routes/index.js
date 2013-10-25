
/*
 * GET home page.
 */

exports.index = function(req, res){
	res.render('index', {title: 'Express: Main'});
};

exports.helloworld = function(req, res){
  res.render('helloworld', { title: 'Express Hey', text: 'hey it works!'});
};

exports.userlist = function(db){
	return function(req, res){
		var collection = db.get('usercollection');
		collection.find({},{}, function(e, docs){
			res.render('userlist', {'userlist': docs});
		});
	}
}

exports.newuser = function(req, res){
	res.render('newuser', {title: 'New User!'});	
};

exports.adduser = function(db){
	return function(req, res){
		var userName = req.body.username;
		var userEmail = req.body.useremail;
		
		var collection = db.get('usercollection');
		
		collection.insert({
			"username" : userName,
			"email" : userEmail
		}, function(error, doc){
			if(error){
				res.send('error adding info to db');
			} else{
				res.redirect('userlist');
				res.location('userlist');
			}
		});
	}	
};
