import React from 'react';
import { IndexRedirect, IndexRoute, Route } from 'react-router';
import ControlApp from 'components/ControlApp';
import RecipeList from 'components/RecipeList';
import RecipeForm from 'components/RecipeForm';
import RecipeHistory from 'components/RecipeHistory';
import RecipePreview from 'components/RecipePreview';
import DeleteRecipe from 'components/DeleteRecipe';
import NoMatch from 'components/NoMatch';

export default (
  <Route path="/control/" component={ControlApp}>
    <IndexRedirect to="recipe/" />
    <Route path="recipe/" name="Recipes">
      <IndexRoute
        component={RecipeList}
        ctaButtons={[
          { text: 'Add New', icon: 'plus', link: 'new/' },
        ]}
      />
      <Route
        path="new/"
        component={RecipeForm}
        name="Add New"
      />
      <Route path=":id/" name="Recipe">
        <IndexRoute
          component={RecipeForm}
          ctaButtons={[
            { text: 'Preview', icon: 'eye', link: 'preview/' },
            { text: 'History', icon: 'history', link: 'history/' },
          ]}
        />
        <Route
          path="preview/"
          component={RecipePreview}
          name="Preview"
        />
        <Route
          path="history/"
          component={RecipeHistory}
          name="History"
        />
        <Route
          path="delete/"
          component={DeleteRecipe}
          name="Delete"
        />
      </Route>
    </Route>
    <Route path="*" component={NoMatch} />
  </Route>
);
