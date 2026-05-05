import pandas as pd
import numpy as np
import pickle
import ast
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, accuracy_score, recall_score, precision_score

print("Loading data and models...")

# 1. Load the original dataset
base_path = os.path.join(os.path.dirname(__file__), '..', 'data')
movies = pd.read_csv(os.path.join(base_path, 'tmdb_5000_movies.csv'))

def convert_genres(text):
    L = []
    try:
        for i in ast.literal_eval(text):
            L.append(i['name'])
    except:
        pass
    return L

movies['genres'] = movies['genres'].apply(convert_genres)

# 2. Load the similarity matrix
models_path = os.path.join(os.path.dirname(__file__), 'models')
similarity = pickle.load(open(os.path.join(models_path, 'similarity.pkl'), 'rb'))

def evaluate_recommender_visual(target_movie_title, movies_df, similarity_matrix, k_recommendations=10, genre_overlap_threshold=2):
    """
    Evaluates the recommender and plots a visual report using matplotlib and seaborn.
    """
    try:
        target_idx = movies_df[movies_df['title'] == target_movie_title].index[0]
    except IndexError:
        print(f"Movie '{target_movie_title}' not found.")
        return

    target_genres = set(movies_df.iloc[target_idx]['genres'])

    # Generate Predictions
    sim_scores = list(enumerate(similarity_matrix[target_idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    top_k_indices = [i[0] for i in sim_scores[1:k_recommendations+1]]

    y_pred = np.zeros(len(movies_df))
    y_pred[top_k_indices] = 1
    y_pred[target_idx] = -1 

    # Generate Ground Truth
    y_actual = np.zeros(len(movies_df))
    for idx, row in movies_df.iterrows():
        if idx == target_idx:
            y_actual[idx] = -1
            continue
            
        movie_genres = set(row['genres'])
        if len(target_genres.intersection(movie_genres)) >= genre_overlap_threshold:
            y_actual[idx] = 1

    # Filter out target movie
    mask = y_actual != -1
    y_actual_filtered = y_actual[mask]
    y_pred_filtered = y_pred[mask]

    # Calculate Metrics
    cm = confusion_matrix(y_actual_filtered, y_pred_filtered)
    accuracy = accuracy_score(y_actual_filtered, y_pred_filtered)
    recall = recall_score(y_actual_filtered, y_pred_filtered, zero_division=0)
    precision = precision_score(y_actual_filtered, y_pred_filtered, zero_division=0)

    # --- VISUALIZATION SECTION ---
    # Create a figure with 1 row and 2 columns
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle(f"Evaluation Report: {target_movie_title}", fontsize=16, fontweight='bold')

    # Plot 1: Confusion Matrix
    sns.heatmap(cm, annot=True, fmt='g', cmap='Blues', ax=axes[0], annot_kws={"size": 14}, cbar=False,
                xticklabels=['Not Recommended', 'Recommended'],
                yticklabels=['Actual: No Match', 'Actual: Match'])
    axes[0].set_title(f"Confusion Matrix (Top {k_recommendations} vs Genre Overlap)", pad=15)
    axes[0].set_xlabel("Predicted by Model", fontweight='bold')
    axes[0].set_ylabel("Ground Truth (>= 2 Shared Genres)", fontweight='bold')

    # Plot 2: Metrics Bar Chart
    metrics_names = ['Accuracy', 'Precision', 'Recall']
    metrics_values = [accuracy, precision, recall]
    colors = ['#4C72B0', '#55A868', '#C44E52']
    
    bars = axes[1].bar(metrics_names, metrics_values, color=colors)
    axes[1].set_ylim(0, 1.1)
    axes[1].set_title("Performance Metrics", pad=15)
    axes[1].set_ylabel("Score (0.0 to 1.0)")
    
    # Add the text values on top of the bars
    for bar in bars:
        yval = bar.get_height()
        axes[1].text(bar.get_x() + bar.get_width()/2, yval + 0.02, 
                     f"{yval:.4f}", ha='center', va='bottom', fontweight='bold', fontsize=12)

    # Display descriptions below the x-axis for context
    axes[1].text(0, -0.15, "Skewed by dataset size", ha='center', va='top', fontsize=9, color='gray')
    axes[1].text(1, -0.15, "Relevance of Top-K", ha='center', va='top', fontsize=9, color='green')
    axes[1].text(2, -0.15, "Total matches found", ha='center', va='top', fontsize=9, color='red')

    plt.tight_layout()
    plt.subplots_adjust(bottom=0.2) # Make room for text
    plt.show()

# --- Run the Evaluation ---
print("Running Evaluation Model...")
evaluate_recommender_visual("Avatar", movies, similarity, k_recommendations=10, genre_overlap_threshold=2)
evaluate_recommender_visual("The Dark Knight", movies, similarity, k_recommendations=10, genre_overlap_threshold=2)