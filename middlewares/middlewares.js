export const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    console.log(req.session);
    req.flash("error", "You must be signed in first!");
    return res.redirect("/auth/google");
  }
  next();
};
