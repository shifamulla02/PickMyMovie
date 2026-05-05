import pandas as pd
import ast
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os

print("Loading datasets...")
base_path = os.path.join(os.path.dirname(__file__), '..', 'data')
movies = pd.read_csv(os.path.join(base_path, 'tmdb_5000_movies.csv'))
credits = pd.read_csv(os.path.join(base_path, 'tmdb_5000_credits.csv'))

print("Merging datasets...")
movies = movies.merge(credits, on='title')

print("Selecting useful columns...")
movies = movies[['movie_id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew']]
movies.dropna(inplace=True)

# Helper functions for parsing
def convert(text):
    L = []
    for i in ast.literal_eval(text):
        L.append(i['name'])
    return L

def convert3(text):
    L = []
    counter = 0
    for i in ast.literal_eval(text):
        if counter != 3:
            L.append(i['name'])
            counter += 1
        else:
            break
    return L

def fetch_director(text):
    L = []
    for i in ast.literal_eval(text):
        if i['job'] == 'Director':
            L.append(i['name'])
            break
    return L

print("Feature engineering...")
movies['genres'] = movies['genres'].apply(convert)
movies['keywords'] = movies['keywords'].apply(convert)
movies['cast'] = movies['cast'].apply(convert3)
movies['crew'] = movies['crew'].apply(fetch_director)
movies['overview'] = movies['overview'].apply(lambda x: x.split())

# Remove spaces to create unique tags
movies['genres'] = movies['genres'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['keywords'] = movies['keywords'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['cast'] = movies['cast'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['crew'] = movies['crew'].apply(lambda x: [i.replace(" ", "") for i in x])

movies['tags'] = movies['overview'] + movies['genres'] + movies['keywords'] + movies['cast'] + movies['crew']

new_df = movies[['movie_id', 'title', 'tags']].copy()
new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x).lower())

# Stemming using NLTK
from nltk.stem.porter import PorterStemmer
ps = PorterStemmer()

def stem(text):
    return " ".join([ps.stem(i) for i in text.split()])

print("Applying Stemming...")
new_df['tags'] = new_df['tags'].apply(stem)

# Vectorization using CountVectorizer
from sklearn.feature_extraction.text import CountVectorizer

print("Applying CountVectorizer...")
cv = CountVectorizer(max_features=5000, stop_words='english')
vectorized_data = cv.fit_transform(new_df['tags'])

# Matrix Factorization using TruncatedSVD (LSA)
print("Applying Matrix Factorization (TruncatedSVD)...")
# Reduce dimensions to capture latent semantic relationships between movies
n_components = 500  # Capturing 500 latent 'topics'
svd = TruncatedSVD(n_components=n_components, random_state=42)
latent_matrix = svd.fit_transform(vectorized_data)

# Measure similarity using Cosine Similarity on the latent matrix
print("Calculating Cosine Similarity on latent features...")
similarity = cosine_similarity(latent_matrix)

# We will export new_df and similarity
print("Saving model files...")
os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
pickle.dump(new_df.to_dict(), open(os.path.join(os.path.dirname(__file__), 'models', 'movies.pkl'), 'wb'))
pickle.dump(similarity, open(os.path.join(os.path.dirname(__file__), 'models', 'similarity.pkl'), 'wb'))

print("Done! Files saved to backend/models/")
