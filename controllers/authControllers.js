const logout = (req, res, next) => {
  try {
    req.logout((err) => {
      if (err) return next(err);
      req.session.regenerate((err) => {
        if (err) return next(err);
      });
      req.flash("success", `You've successfully logged out!`);
      res.redirect("/");
    });
  } catch (e) {
    req.flash("error", "Internal server error, Please try again!");
    return res.redirect("/");
  }
};

export { logout };
